import { Resend } from "resend";
import { TaskReviewNotification } from "@/emails/task-review-notification";
import { DailyDigest } from "@/emails/daily-digest";
import { RevisionReminder } from "@/emails/revision-reminder";
import { ReviewPending } from "@/emails/review-pending";
import { TaskAssigned } from "@/emails/task-assigned";
import { ActionItemAssigned } from "@/emails/action-item-assigned";
import { DueDateReminder } from "@/emails/due-date-reminder";
import { OverdueTask } from "@/emails/overdue-task";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Prelim <noreply@prelim.app>";

type SendTaskReviewEmailInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  status: "approved" | "rejected" | "revision_required";
  comment?: string;
};

export async function sendTaskReviewEmail(input: SendTaskReviewEmailInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Task ${input.status.replace("_", " ")}: ${input.taskTitle}`,
    react: (
      <TaskReviewNotification
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        status={input.status}
        comment={input.comment}
      />
    )
  });
}

type SendDailyDigestInput = {
  to: string;
  recipientName: string;
  date: string;
  absentCount: number;
  pendingReviewCount: number;
  absentStaff: { name: string; email: string }[];
};

export async function sendDailyDigestEmail(input: SendDailyDigestInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Prelim Daily Digest — ${input.date}`,
    react: (
      <DailyDigest
        recipientName={input.recipientName}
        date={input.date}
        absentCount={input.absentCount}
        pendingReviewCount={input.pendingReviewCount}
        absentStaff={input.absentStaff}
      />
    )
  });
}

type SendRevisionReminderInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  daysSinceRevision: number;
  reviewComment?: string;
};

export async function sendRevisionReminderEmail(input: SendRevisionReminderInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Action needed: ${input.taskTitle} awaiting revision`,
    react: (
      <RevisionReminder
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        projectName={input.projectName}
        daysSinceRevision={input.daysSinceRevision}
        reviewComment={input.reviewComment}
      />
    )
  });
}

type PendingTask = {
  title: string;
  projectName: string;
  submittedHoursAgo: number;
  assigneeName: string;
};

type SendReviewPendingInput = {
  to: string;
  recipientName: string;
  pendingCount: number;
  tasks: PendingTask[];
};

export async function sendReviewPendingEmail(input: SendReviewPendingInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `${input.pendingCount} task${input.pendingCount !== 1 ? "s" : ""} awaiting your review`,
    react: (
      <ReviewPending
        recipientName={input.recipientName}
        pendingCount={input.pendingCount}
        tasks={input.tasks}
      />
    )
  });
}

// --- New task assigned (immediate trigger) ---
type SendTaskAssignedInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  projectCode: string;
  assignedByName: string;
  dueDate?: string;
  tradeCode?: string;
};

export async function sendTaskAssignedEmail(input: SendTaskAssignedInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `New task assigned: ${input.taskTitle}`,
    react: (
      <TaskAssigned
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        projectName={input.projectName}
        projectCode={input.projectCode}
        assignedByName={input.assignedByName}
        dueDate={input.dueDate}
        tradeCode={input.tradeCode}
      />
    )
  });
}

// --- Action item assigned (non-review task, immediate trigger) ---
type SendActionItemAssignedInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  projectCode: string;
  assignedByName: string;
  dueDate?: string;
};

export async function sendActionItemAssignedEmail(input: SendActionItemAssignedInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Action item: ${input.taskTitle}`,
    react: (
      <ActionItemAssigned
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        projectName={input.projectName}
        projectCode={input.projectCode}
        assignedByName={input.assignedByName}
        dueDate={input.dueDate}
      />
    )
  });
}

// --- Due date approaching (cron) ---
type SendDueDateReminderInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  daysUntilDue: number;
};

export async function sendDueDateReminderEmail(input: SendDueDateReminderInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Reminder: "${input.taskTitle}" due in ${input.daysUntilDue} day${input.daysUntilDue !== 1 ? "s" : ""}`,
    react: (
      <DueDateReminder
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        projectName={input.projectName}
        dueDate={input.dueDate}
        daysUntilDue={input.daysUntilDue}
      />
    )
  });
}

// --- Overdue task (cron) ---
type SendOverdueTaskInput = {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  daysOverdue: number;
  assigneeName?: string;
};

export async function sendOverdueTaskEmail(input: SendOverdueTaskInput) {
  return resend.emails.send({
    from: FROM,
    to: [input.to],
    subject: `Overdue: "${input.taskTitle}" was due ${input.daysOverdue} day${input.daysOverdue !== 1 ? "s" : ""} ago`,
    react: (
      <OverdueTask
        recipientName={input.recipientName}
        taskTitle={input.taskTitle}
        projectName={input.projectName}
        dueDate={input.dueDate}
        daysOverdue={input.daysOverdue}
        assigneeName={input.assigneeName}
      />
    )
  });
}
