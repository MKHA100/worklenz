import { requireOneOfRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { ReviewQueuePageClient } from "@/components/review/review-queue-page-client";

export default async function ReviewQueuePage() {
  await requireOneOfRoles(["owner", "admin", "managing_director", "senior_qs"]);

  const tasks = await prisma.task.findMany({
    where: { status: { in: ["SUBMITTED", "Submitted", "submitted"] } },
    include: {
      project: { select: { id: true, name: true, code: true } },
      assignee: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }]
  });

  return (
    <ReviewQueuePageClient
      initialTasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        revisionCount: t.revisionCount,
        submittedAt: t.submittedAt?.toISOString() ?? null,
        reviewComment: t.reviewComment,
        timeSpentMinute: t.timeSpentMinute,
        project: t.project,
        assignee: t.assignee
      }))}
    />
  );
}
