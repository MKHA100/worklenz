import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { ProjectViewClient } from "@/components/projects/project-view-client";
import { clerkClient } from "@clerk/nextjs/server";

type Props = { params: Promise<{ projectId: string }> };

const REVIEWER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];
const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

async function fetchClerkImageMap(clerkIds: string[]): Promise<Record<string, string>> {
  if (clerkIds.length === 0) return {};
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ userId: clerkIds, limit: 200 });
    return Object.fromEntries(result.data.map((u) => [u.id, u.imageUrl]));
  } catch {
    return {};
  }
}

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
        assignee: { select: { id: true, fullName: true, email: true, clerkId: true } },
        taskMembers: { include: { user: { select: { id: true, fullName: true, email: true, clerkId: true } } } },
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
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, email: true, role: true, clerkId: true } } },
      orderBy: { addedAt: "asc" }
    }),
    prisma.userProfile.findMany({
      select: { id: true, fullName: true, email: true, role: true, clerkId: true },
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

  // Collect all unique Clerk IDs for image fetch
  const allClerkIds = [
    ...projectMemberRecords.map((pm) => pm.user.clerkId),
    ...allUsersRaw.map((u) => u.clerkId),
    ...rawTasks.flatMap((t) => [
      t.assignee?.clerkId,
      ...t.taskMembers.map((tm) => tm.user.clerkId)
    ]).filter((id): id is string => Boolean(id))
  ].filter((id): id is string => Boolean(id));
  const uniqueClerkIds = [...new Set(allClerkIds)];
  const imageMap = await fetchClerkImageMap(uniqueClerkIds);

  const members = projectMemberRecords.map((pm) => ({
    ...pm.user,
    imageUrl: pm.user.clerkId ? (imageMap[pm.user.clerkId] ?? null) : null
  }));
  const allUsers = allUsersRaw.map((u) => ({
    ...u,
    imageUrl: u.clerkId ? (imageMap[u.clerkId] ?? null) : null
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
        assignee: t.assignee ? {
          id: t.assignee.id,
          fullName: t.assignee.fullName,
          email: t.assignee.email,
          imageUrl: t.assignee.clerkId ? (imageMap[t.assignee.clerkId] ?? null) : null
        } : null,
        taskMemberIds: t.taskMembers.map((tm) => tm.userId),
        taskMemberUsers: t.taskMembers.map((tm) => ({
          id: tm.user.id,
          fullName: tm.user.fullName,
          email: tm.user.email,
          imageUrl: tm.user.clerkId ? (imageMap[tm.user.clerkId] ?? null) : null
        })),
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
