import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendDueDateReminderEmail } from "@/lib/email/resend";
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
  // Find tasks due in the next 1–2 days (not yet approved/rejected)
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  try {
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: oneDayFromNow, lte: twoDaysFromNow },
        status: { notIn: ["APPROVED", "REJECTED"] }
      },
      include: {
        project: { select: { name: true, code: true } },
        taskMembers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        assignee: { select: { id: true, fullName: true, email: true } }
      }
    });

    if (tasks.length === 0) {
      await logInfo("cron.due-date-reminder.run", { at: now.toISOString(), sent: 0 });
      return NextResponse.json({ ok: true, job: "due-date-reminder", sent: 0 });
    }

    let sent = 0;
    for (const task of tasks) {
      const daysUntilDue = Math.ceil(
        ((task.dueDate as Date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dueDateStr = (task.dueDate as Date).toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
      });

      // Collect unique assignees (from taskMembers or fall back to assignee)
      const recipients = task.taskMembers.length > 0
        ? task.taskMembers.map((tm) => tm.user)
        : task.assignee ? [task.assignee] : [];

      for (const user of recipients) {
        try {
          await sendDueDateReminderEmail({
            to: user.email,
            recipientName: user.fullName ?? user.email,
            taskTitle: task.title,
            projectName: task.project.name,
            dueDate: dueDateStr,
            daysUntilDue
          });
          sent++;
        } catch (err) {
          await logError("cron.due-date-reminder.emailError", {
            to: user.email,
            taskId: task.id,
            message: err instanceof Error ? err.message : "Unknown"
          });
        }
      }
    }

    await logInfo("cron.due-date-reminder.run", { at: now.toISOString(), tasksFound: tasks.length, sent });
    return NextResponse.json({ ok: true, job: "due-date-reminder", tasksFound: tasks.length, sent });
  } catch (error) {
    await logError("cron.due-date-reminder.error", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
