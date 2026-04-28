import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redis } from "@/lib/cache/redis";
import { prisma } from "@/lib/db/prisma";
import { logError, logInfo } from "@/lib/logging/axiom";
import { publishRealtimeEvent, publishRealtimeEventToUsers } from "@/lib/realtime/publish";
import { getProjectAffectedUserIds } from "@/lib/realtime/affected-users";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

const DEFAULT_TAKE = 250;

export async function GET(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const takeRaw = Number(searchParams.get("take") ?? DEFAULT_TAKE);
  const take = Number.isFinite(takeRaw)
    ? Math.max(1, Math.min(500, Math.floor(takeRaw)))
    : DEFAULT_TAKE;

  const useCache = !cursor && !searchParams.has("take") && take === DEFAULT_TAKE;
  const cacheKey = `project:${projectId}:tasks`;

  try {
    if (useCache) {
      const cached = await redis()?.get(cacheKey);
      if (cached) {
        return NextResponse.json({ source: "cache", data: cached, nextCursor: null });
      }
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: useCache ? take : take + 1
    });

    if (useCache) {
      await redis()?.set(cacheKey, tasks, { ex: 60, nx: true });
      await logInfo("api.project.tasks.list", { projectId, count: tasks.length });
      return NextResponse.json({ source: "db", data: tasks, nextCursor: null });
    }

    const hasMore = tasks.length > take;
    const page = hasMore ? tasks.slice(0, take) : tasks;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    await logInfo("api.project.tasks.list", { projectId, count: page.length, paginated: true });

    return NextResponse.json({ source: "db", data: page, nextCursor });
  } catch (error) {
    await logError("api.project.tasks.list.error", {
      projectId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const payload = (await request.json()) as { title?: string; description?: string };
    if (!payload.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: payload.title,
        description: payload.description ?? null,
        projectId
      }
    });

    await redis()?.del(`project:${projectId}:tasks`);
    await logInfo("api.project.tasks.create", { projectId, taskId: task.id, actor: userId });

    void (async () => {
      const affectedUserIds = await getProjectAffectedUserIds(projectId, [userId]);
      const payload = {
        projectId,
        taskId: task.id,
        affectedUserIds,
        actorUserId: userId,
        changeType: "created" as const
      };
      await Promise.allSettled([
        publishRealtimeEvent({
          channel: `project:${projectId}`,
          event: "task.created",
          payload
        }),
        publishRealtimeEventToUsers(affectedUserIds, "task.created", payload)
      ]);
    })();

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    await logError("api.project.tasks.create.error", {
      projectId,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
