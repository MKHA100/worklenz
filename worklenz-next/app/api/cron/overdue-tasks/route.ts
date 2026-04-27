import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendOverdueTaskEmail } from "@/lib/email/resend";
import { logError, logInfo } from "@/lib/logging/axiom";

function isAuthorized(authHeader: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function GET() {
  const h = await headers();
  if (!isAuthorized(h.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["APPROVED", "REJECTED"] }
      },
      include: {
        project: { select: { name: true, code: true } },
        taskMembers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        assignee: { select: { id: true, fullName: true, email: true } }
      }
    });

    if (overdueTasks.length === 0) {
      await logInfo("cron.overdue-tasks.run", { at: now.toISOString(), sent: 0 });
      return NextResponse.json({ ok: true, job: "overdue-tasks", sent: 0 });
    }

    // Also notify managing directors and seniors
    const managers = await prisma.userProfile.findMany({
      where: { role: { in: ["managing_director", "senior_qs", "admin", "owner"] } },
      select: { id: true, fullName: true, email: true }
    });

    let sent = 0;

    for (const task of overdueTasks) {
      const daysOverdue = Math.floor(
        (now.getTime() - (task.dueDate as Date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const dueDateStr = (task.dueDate as Date).toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });

      const assignees = task.taskMembers.length > 0
        ? task.taskMembers.map((tm) => tm.user)
        : task.assignee ? [task.assignee] : [];

      const assigneeNames = assignees.map((u) => u.fullName ?? u.email).join(", ");

      // Notify assignees directly
      for (const user of assignees) {
        try {
          await sendOverdueTaskEmail({
            to: user.email,
            recipientName: user.fullName ?? user.email,
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: dueDateStr,
            daysOverdue
          });
          sent++;
        } catch (err) {
          await logError("cron.overdue-tasks.assigneeEmailError", {
            to: user.email, taskId: task.id,
            message: err instanceof Error ? err.message : "Unknown"
          });
        }
      }

      // Notify managers (with assignee name for context)
      for (const manager of managers) {
        // Skip if manager is also an assignee (already notified above)
        if (assignees.some((a) => a.id === manager.id)) continue;
        try {
          await sendOverdueTaskEmail({
            to: manager.email,
            recipientName: manager.fullName ?? manager.email,
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: dueDateStr,
            daysOverdue,
            assigneeName: assigneeNames || undefined
          });
          sent++;
        } catch (err) {
          await logError("cron.overdue-tasks.managerEmailError", {
            to: manager.email, taskId: task.id,
            message: err instanceof Error ? err.message : "Unknown"
          });
        }
      }
    }

    await logInfo("cron.overdue-tasks.run", { at: now.toISOString(), overdueCount: overdueTasks.length, sent });
    return NextResponse.json({ ok: true, job: "overdue-tasks", overdueCount: overdueTasks.length, sent });
  } catch (error) {
    await logError("cron.overdue-tasks.error", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
