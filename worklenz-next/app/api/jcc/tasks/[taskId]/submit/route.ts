import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publish";
import { requireUserProfile } from "@/lib/users/profile";

type RouteContext = { params: Promise<{ taskId: string }> };

const SUBMITTABLE_STATUSES = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED"];

export async function POST(req: Request, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await req.json().catch(() => ({})) as {
    submissionNote?: string;
    reviewerId?: string;
  };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { logs: { select: { minutes: true } } }
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (task.assigneeId !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!SUBMITTABLE_STATUSES.includes(task.status)) {
    return NextResponse.json(
      { error: `Cannot submit task in status ${task.status}` },
      { status: 409 }
    );
  }

  const loggedMinutes = task.logs.reduce((sum, log) => sum + log.minutes, 0);
  if (loggedMinutes <= 0 && task.timeSpentMinute <= 0) {
    return NextResponse.json({ error: "Cannot submit without a time log" }, { status: 400 });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      submissionNote: body.submissionNote ?? null,
      reviewerId: body.reviewerId ?? null
    }
  });

  await publishRealtimeEvent({
    channel: `project:${updated.projectId}`,
    event: "task.submitted",
    payload: { taskId: updated.id, projectId: updated.projectId, actorUserId: profile.id }
  });

  return NextResponse.json({ task: updated });
}
