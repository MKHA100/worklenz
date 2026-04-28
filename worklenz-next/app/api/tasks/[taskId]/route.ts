import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { redis } from "@/lib/cache/redis";
import { logInfo } from "@/lib/logging/axiom";
import { publishRealtimeEvent, publishRealtimeEventToUsers } from "@/lib/realtime/publish";
import { getProjectAffectedUserIds } from "@/lib/realtime/affected-users";

type RouteContext = { params: Promise<{ taskId: string }> };

const ALLOWED_STATUSES = [
  "ASSIGNED", "IN_PROGRESS", "QUERY_RAISED", "EXTENSION_REQUESTED",
  "SUBMITTED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "ON_HOLD"
];

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, fullName: true, email: true, clerkId: true } },
      taskMembers: { include: { user: { select: { id: true, fullName: true, email: true, clerkId: true } } } },
      attachments: {
        where: { submissionId: null },
        select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true }
      },
      submissions: {
        orderBy: { roundNumber: "asc" },
        include: {
          submittedBy: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
          attachments: { select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true } }
        }
      }
    }
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    task: {
      ...task,
      startDate: task.startDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      submittedAt: task.submittedAt?.toISOString() ?? null,
      reviewedAt: task.reviewedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      taskMemberIds: task.taskMembers.map((tm) => tm.userId),
      taskMemberUsers: task.taskMembers.map((tm) => ({
        id: tm.user.id, fullName: tm.user.fullName, email: tm.user.email, imageUrl: null
      })),
      attachments: task.attachments.map((a) => ({
        ...a, createdAt: a.createdAt.toISOString()
      })),
      submissions: task.submissions.map((s) => ({
        ...s,
        submittedAt: s.submittedAt.toISOString(),
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        attachments: s.attachments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
      }))
    }
  });
}

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
    priority?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    timeEstimate?: number | null;
    requiresReview?: boolean;
  };

  if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const REVIEW_OUTCOMES = ["APPROVED", "REVISION_REQUIRED", "REJECTED", "ON_HOLD"];
  const now = new Date();

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? {
        status: body.status,
        ...(body.status === "SUBMITTED" ? { submittedAt: now } : {}),
        ...(REVIEW_OUTCOMES.includes(body.status) ? { reviewedAt: now } : {}),
        ...(body.status === "REVISION_REQUIRED" ? { revisionCount: { increment: 1 } } : {})
      } : {}),
      ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
      ...(body.reviewComment !== undefined ? { reviewComment: body.reviewComment } : {}),
      ...(body.plannedRate !== undefined ? { plannedRate: body.plannedRate } : {}),
      ...(body.actualRate !== undefined ? { actualRate: body.actualRate } : {}),
      ...(body.timeSpentMinute !== undefined ? { timeSpentMinute: body.timeSpentMinute } : {}),
      ...(body.unit !== undefined ? { unit: body.unit } : {}),
      ...(body.tradeCode !== undefined ? { tradeCode: body.tradeCode } : {}),
      ...(body.priority !== undefined ? { priority: body.priority ?? "NORMAL" } : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
      ...(body.timeEstimate !== undefined ? { timeEstimate: body.timeEstimate } : {}),
      ...(body.requiresReview !== undefined ? { requiresReview: body.requiresReview } : {})
    },
    include: { assignee: { select: { id: true, fullName: true, email: true } } }
  });

  // Stamp the pending submission with the reviewer's outcome
  if (body.status && REVIEW_OUTCOMES.includes(body.status)) {
    const pending = await prisma.taskSubmission.findFirst({
      where: { taskId, outcome: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
    if (pending) {
      await prisma.taskSubmission.update({
        where: { id: pending.id },
        data: {
          reviewedById: profile.id,
          reviewedAt: now,
          reviewComment: body.reviewComment ?? null,
          outcome: body.status
        }
      });
    }
  }

  const r = redis();
  if (r) await r.del(`project:${task.projectId}:tasks`);
  await logInfo("api.tasks.update", { taskId, actor: profile.id, status: body.status });

  void (async () => {
    const assigneeChanged = body.assigneeId !== undefined && body.assigneeId !== task.assigneeId;
    const statusChanged = body.status !== undefined && body.status !== task.status;
    const changeType = assigneeChanged
      ? "assignee_changed"
      : statusChanged
        ? "status_changed"
        : "updated";

    const affectedUserIds = await getProjectAffectedUserIds(task.projectId, [
      profile.id,
      task.assigneeId,
      updated.assigneeId
    ]);

    const updatedPayload = {
      projectId: task.projectId,
      taskId,
      affectedUserIds,
      actorUserId: profile.id,
      changeType,
      status: updated.status,
      previousStatus: task.status,
      assigneeId: updated.assigneeId,
      previousAssigneeId: task.assigneeId
    } as const;

    const publishOps: Array<Promise<unknown>> = [
      publishRealtimeEvent({
        channel: `project:${task.projectId}`,
        event: "task.updated",
        payload: updatedPayload
      }),
      publishRealtimeEventToUsers(affectedUserIds, "task.updated", updatedPayload)
    ];

    if (assigneeChanged) {
      const membersPayload = {
        projectId: task.projectId,
        taskId,
        affectedUserIds,
        actorUserId: profile.id,
        changeType: "members_changed" as const,
        action: "reassigned" as const
      };
      publishOps.push(
        publishRealtimeEvent({
          channel: `project:${task.projectId}`,
          event: "task.members.changed",
          payload: membersPayload
        }),
        publishRealtimeEventToUsers(affectedUserIds, "task.members.changed", membersPayload)
      );
    }

    if (statusChanged && ["SUBMITTED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "ON_HOLD"].includes(updated.status)) {
      const submissionPayload = {
        projectId: task.projectId,
        taskId,
        affectedUserIds,
        actorUserId: profile.id,
        changeType: "submission_changed" as const,
        outcome: updated.status
      };
      publishOps.push(
        publishRealtimeEvent({
          channel: `project:${task.projectId}`,
          event: "task.submission.changed",
          payload: submissionPayload
        }),
        publishRealtimeEventToUsers(affectedUserIds, "task.submission.changed", submissionPayload)
      );
    }

    await Promise.allSettled(publishOps);
  })();

  return NextResponse.json({ task: updated });
}
