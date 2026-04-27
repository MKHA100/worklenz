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

  const task = await prisma.task.findUnique({ where: { id: taskId } });

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

  const roundNumber = await prisma.taskSubmission.count({ where: { taskId } }) + 1;

  const [updated, submission] = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        submissionNote: body.submissionNote ?? null,
        reviewerId: body.reviewerId ?? null
      }
    });

    const newSubmission = await tx.taskSubmission.create({
      data: {
        taskId,
        roundNumber,
        submittedById: profile.id,
        submissionNote: body.submissionNote ?? null,
        outcome: "PENDING"
      }
    });

    // Link all orphan attachments (uploaded this round) to this submission
    await tx.taskAttachment.updateMany({
      where: { taskId, submissionId: null },
      data: { submissionId: newSubmission.id }
    });

    return [updatedTask, newSubmission];
  });

  // Fetch submission with full relations for response
  const submissionFull = await prisma.taskSubmission.findUnique({
    where: { id: submission.id },
    include: {
      submittedBy: { select: { id: true, fullName: true, email: true } },
      reviewedBy: { select: { id: true, fullName: true, email: true } },
      attachments: true
    }
  });

  void publishRealtimeEvent({
    channel: `project:${updated.projectId}`,
    event: "task_submission_changed",
    payload: { taskId: updated.id, projectId: updated.projectId, actorUserId: profile.id }
  });

  return NextResponse.json({ task: updated, submission: submissionFull });
}
