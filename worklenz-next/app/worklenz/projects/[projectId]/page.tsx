import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { ProjectViewClient } from "@/components/projects/project-view-client";

type Props = { params: Promise<{ projectId: string }> };

const REVIEWER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];

export default async function ProjectPage({ params }: Props) {
  const profile = await requireUserProfile();
  if (!profile) notFound();

  const { projectId } = await params;

  const [project, rawTasks, members] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { office: { select: { name: true, code: true } } }
    }),
    prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        attachments: { select: { id: true, fileKey: true, fileName: true, mimeType: true, fileSize: true, createdAt: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.userProfile.findMany({
      select: { id: true, fullName: true, email: true, role: true }
    })
  ]);

  if (!project) notFound();

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
          id: a.id,
          fileKey: a.fileKey,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          createdAt: a.createdAt.toISOString()
        }))
      }))}
      members={members}
      seniors={seniors}
    />
  );
}
