import { requireOneOfRoles } from "@/lib/auth/roles";
import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { ReviewQueuePageClient } from "@/components/review/review-queue-page-client";

const SUBMISSION_INCLUDE = {
  orderBy: { roundNumber: "asc" as const },
  include: {
    submittedBy: { select: { id: true, fullName: true, email: true } },
    reviewedBy: { select: { id: true, fullName: true, email: true } },
    attachments: {
      select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true }
    }
  }
};

const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export default async function ReviewQueuePage() {
  const profile = await requireUserProfile();
  await requireOneOfRoles(["owner", "admin", "managing_director", "senior_qs"]);
  if (!profile) return null;

  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);

  const tasks = await prisma.task.findMany({
    where: {
      status: "SUBMITTED",
      ...(isUnrestricted ? {} : { project: { members: { some: { userId: profile.id } } } })
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      assignee: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
      submissions: SUBMISSION_INCLUDE
    },
    orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }],
    take: 50
  });

  return (
    <ReviewQueuePageClient
      userId={profile.id}
      initialTasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        revisionCount: t.revisionCount,
        submittedAt: t.submittedAt?.toISOString() ?? null,
        submissionNote: t.submissionNote,
        reviewComment: t.reviewComment,
        timeSpentMinute: t.timeSpentMinute,
        reviewerId: t.reviewerId,
        project: t.project,
        assignee: t.assignee,
        reviewer: t.reviewer,
        submissions: t.submissions.map((s) => ({
          id: s.id,
          roundNumber: s.roundNumber,
          submittedAt: s.submittedAt.toISOString(),
          submissionNote: s.submissionNote,
          outcome: s.outcome,
          reviewedAt: s.reviewedAt?.toISOString() ?? null,
          reviewComment: s.reviewComment,
          submittedBy: s.submittedBy,
          reviewedBy: s.reviewedBy,
          attachments: s.attachments.map((a) => ({
            id: a.id,
            fileKey: a.fileKey,
            fileName: a.fileName,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
            createdAt: a.createdAt.toISOString()
          }))
        }))
      }))}
    />
  );
}
