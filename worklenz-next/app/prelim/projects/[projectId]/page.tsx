import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { ProjectViewClient } from "@/components/projects/project-view-client";

type Props = { params: Promise<{ projectId: string }> };

const REVIEWER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];
const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export default async function ProjectPage({ params }: Props) {
  const profile = await requireUserProfile();
  if (!profile) notFound();

  const { projectId } = await params;

  const [project, rawTasks, projectMemberRecords, allUsers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { office: { select: { name: true, code: true } } }
    }),
    prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        attachments: {
          where: { submissionId: null },
          select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true }
        },
        submissions: {
          orderBy: { roundNumber: "asc" },
          include: {
            submittedBy: { select: { id: true, fullName: true, email: true } },
            reviewedBy:  { select: { id: true, fullName: true, email: true } },
            attachments: { select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    // Members of this project only
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { addedAt: "asc" }
    }),
    // All users — for the "add member" dropdown
    prisma.userProfile.findMany({
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: "asc" }
    })
  ]);

  if (!project) notFound();

  // Non-admin roles must be project members
  if (!UNRESTRICTED_ROLES.includes(profile.role)) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: profile.id } }
    });
    if (!membership) redirect("/prelim/unauthorized");
  }

  const members = projectMemberRecords.map((pm) => pm.user);
  const seniors = members.filter((m) => REVIEWER_ROLES.includes(m.role));

  return (
    <ProjectViewClient
      currentUserId={profile.id}
      userRole={profile.role}
      project={{
        id: project.id,
        name: project.name,
        code: project.code,
        officeName: project.office?.name ?? null
      }}
      initialTasks={rawTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        projectId: t.projectId,
        assigneeId: t.assigneeId,
        reviewerId: t.reviewerId,
        submissionNote: t.submissionNote,
        reviewComment: t.reviewComment,
        reviewOutcome: t.reviewOutcome,
        submittedAt: t.submittedAt?.toISOString() ?? null,
        reviewedAt: t.reviewedAt?.toISOString() ?? null,
        revisionCount: t.revisionCount,
        timeSpentMinute: t.timeSpentMinute,
        plannedRate: t.plannedRate,
        actualRate: t.actualRate,
        efficiency: t.efficiency,
        variance: t.variance,
        unit: t.unit,
        tradeCode: t.tradeCode,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        assignee: t.assignee,
        attachments: t.attachments.map((a) => ({
          id: a.id, fileKey: a.fileKey, fileName: a.fileName,
          mimeType: a.mimeType, fileSize: a.fileSize, createdAt: a.createdAt.toISOString()
        })),
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
            id: a.id, fileKey: a.fileKey, fileName: a.fileName,
            mimeType: a.mimeType, fileSize: a.fileSize, createdAt: a.createdAt.toISOString()
          }))
        }))
      }))}
      members={members}
      seniors={seniors}
      allUsers={allUsers}
    />
  );
}
