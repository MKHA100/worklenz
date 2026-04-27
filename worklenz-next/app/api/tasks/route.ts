import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { logInfo, logError } from "@/lib/logging/axiom";
import { sendTaskAssignedEmail, sendActionItemAssignedEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    assigneeIds?: string[];
    tradeCode?: string;
    unit?: string;
    plannedRate?: number;
    priority?: string;
    startDate?: string | null;
    dueDate?: string | null;
    timeEstimate?: number | null;
    requiresReview?: boolean;
  };

  if (!body.projectId || !body.title?.trim()) {
    return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const assigneeIds = body.assigneeIds?.filter(Boolean) ?? [];
  const primaryAssigneeId = assigneeIds[0] ?? null;
  const requiresReview = body.requiresReview ?? true;

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId: body.projectId,
        title: body.title.trim(),
        description: body.description ?? null,
        status: body.status ?? "ASSIGNED",
        assigneeId: primaryAssigneeId,
        tradeCode: body.tradeCode ?? null,
        unit: body.unit ?? null,
        plannedRate: body.plannedRate ?? null,
        priority: body.priority ?? "NORMAL",
        startDate: body.startDate ? new Date(body.startDate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        timeEstimate: body.timeEstimate ?? null,
        requiresReview
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        taskMembers: { include: { user: { select: { id: true, fullName: true, email: true } } } }
      }
    });

    if (assigneeIds.length > 0) {
      await tx.taskMember.createMany({
        data: assigneeIds.map((userId) => ({ taskId: created.id, userId })),
        skipDuplicates: true
      });
    }

    return created;
  });

  await logInfo("api.tasks.create", { taskId: task.id, projectId: body.projectId, actor: profile.id });

  // Fire-and-forget assignment emails — fetch assignee profiles
  if (assigneeIds.length > 0) {
    prisma.userProfile.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, fullName: true, email: true }
    }).then(async (assignees) => {
      const dueDateStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
        : undefined;

      const senderName = profile.fullName ?? profile.email;

      for (const assignee of assignees) {
        // Skip sending email to yourself
        if (assignee.id === profile.id) continue;

        try {
          if (requiresReview) {
            await sendTaskAssignedEmail({
              to: assignee.email,
              recipientName: assignee.fullName ?? assignee.email,
              taskTitle: task.title,
              projectName: project.name,
              projectCode: project.code,
              assignedByName: senderName,
              dueDate: dueDateStr,
              tradeCode: task.tradeCode ?? undefined
            });
          } else {
            await sendActionItemAssignedEmail({
              to: assignee.email,
              recipientName: assignee.fullName ?? assignee.email,
              taskTitle: task.title,
              projectName: project.name,
              projectCode: project.code,
              assignedByName: senderName,
              dueDate: dueDateStr
            });
          }
        } catch (err) {
          await logError("api.tasks.create.emailError", {
            to: assignee.email,
            taskId: task.id,
            message: err instanceof Error ? err.message : "Unknown"
          });
        }
      }
    }).catch(() => { /* don't block response on email failure */ });
  }

  return NextResponse.json({ task }, { status: 201 });
}
