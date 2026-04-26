import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { redis } from "@/lib/cache/redis";
import { logInfo } from "@/lib/logging/axiom";

type RouteContext = { params: Promise<{ taskId: string }> };

const ALLOWED_STATUSES = [
  "ASSIGNED", "IN_PROGRESS", "QUERY_RAISED", "EXTENSION_REQUESTED",
  "SUBMITTED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "ON_HOLD"
];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    status?: string;
    assigneeId?: string | null;
    reviewComment?: string | null;
    plannedRate?: number | null;
    actualRate?: number | null;
    timeSpentMinute?: number;
    unit?: string | null;
    tradeCode?: string | null;
  };

  if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date();
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? {
        status: body.status,
        ...(body.status === "SUBMITTED" ? { submittedAt: now } : {}),
        ...(["APPROVED", "REJECTED", "REVISION_REQUIRED"].includes(body.status) ? { reviewedAt: now } : {}),
        ...(body.status === "REVISION_REQUIRED" ? { revisionCount: { increment: 1 } } : {})
      } : {}),
      ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
      ...(body.reviewComment !== undefined ? { reviewComment: body.reviewComment } : {}),
      ...(body.plannedRate !== undefined ? { plannedRate: body.plannedRate } : {}),
      ...(body.actualRate !== undefined ? { actualRate: body.actualRate } : {}),
      ...(body.timeSpentMinute !== undefined ? { timeSpentMinute: body.timeSpentMinute } : {}),
      ...(body.unit !== undefined ? { unit: body.unit } : {}),
      ...(body.tradeCode !== undefined ? { tradeCode: body.tradeCode } : {})
    },
    include: { assignee: { select: { id: true, fullName: true, email: true } } }
  });

  const r = redis();
  if (r) await r.del(`project:${task.projectId}:tasks`);
  await logInfo("api.tasks.update", { taskId, actor: profile.id, status: body.status });

  return NextResponse.json({ task: updated });
}
