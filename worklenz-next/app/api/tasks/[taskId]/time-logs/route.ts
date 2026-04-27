import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const logs = await prisma.taskTimeLog.findMany({
    where: { taskId },
    orderBy: { startedAt: "desc" }
  });

  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = (await request.json()) as { startedAt: string; endedAt: string; minutes: number };

  if (!body.startedAt || !body.endedAt || typeof body.minutes !== "number") {
    return NextResponse.json({ error: "startedAt, endedAt, minutes required" }, { status: 400 });
  }

  const log = await prisma.taskTimeLog.create({
    data: {
      taskId,
      startedAt: new Date(body.startedAt),
      endedAt: new Date(body.endedAt),
      minutes: body.minutes
    }
  });

  return NextResponse.json({ log }, { status: 201 });
}
