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

  const [project, rawTasks, projectMemberRecords, allUsersRaw] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { office: { select: { name: true, code: true } } }
    }),
    prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        taskMembers: { include: { user: { select: { id: true, fullName: true, email: true } } } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { addedAt: "asc" }
    }),
    prisma.userProfile.findMany({
      where: { projectMemberships: { some: { projectId } } },
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

  const members = projectMemberRecords.map((pm) => ({
    ...pm.user,
    imageUrl: null
  }));
  const allUsers = allUsersRaw.map((u) => ({
    ...u,
    imageUrl: null
  }));
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
        priority: t.priority ?? "NORMAL",
        startDate: t.startDate?.toISOString() ?? null,
        dueDate: t.dueDate?.toISOString() ?? null,
        timeEstimate: t.timeEstimate ?? null,
        requiresReview: t.requiresReview,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              fullName: t.assignee.fullName,
              email: t.assignee.email,
              imageUrl: null
            }
          : null,
        taskMemberIds: t.taskMembers.map((tm) => tm.userId),
        taskMemberUsers: t.taskMembers.map((tm) => ({
          id: tm.user.id,
          fullName: tm.user.fullName,
          email: tm.user.email,
          imageUrl: null
        })),
        attachments: [],
        submissions: []
      }))}
      members={members}
      seniors={seniors}
      allUsers={allUsers}
    />
  );
}
