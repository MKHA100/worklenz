import { requireOneOfRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { ReportingClient } from "@/components/reporting/reporting-client";

export default async function ReportingOverviewPage() {
  await requireOneOfRoles(["owner", "admin", "managing_director", "senior_qs"]);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalTasks, approvedTasks, submittedTasks, revisionTasks,
    totalProjects, activeUsers,
    tasksByStatus, recentActivity
  ] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: "APPROVED" } }),
    prisma.task.count({ where: { status: "SUBMITTED" } }),
    prisma.task.count({ where: { status: "REVISION_REQUIRED" } }),
    prisma.project.count(),
    prisma.userProfile.count(),
    prisma.task.groupBy({
      by: ["status"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    }),
    prisma.task.findMany({
      where: { updatedAt: { gte: startOfMonth } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        project: { select: { name: true, code: true } },
        assignee: { select: { fullName: true, email: true } }
      }
    })
  ]);

  return (
    <ReportingClient
      stats={{ totalTasks, approvedTasks, submittedTasks, revisionTasks, totalProjects, activeUsers }}
      tasksByStatus={tasksByStatus.map((t) => ({ status: t.status, count: t._count.id }))}
      recentActivity={recentActivity.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        projectName: t.project.name,
        projectCode: t.project.code,
        assigneeName: t.assignee?.fullName ?? t.assignee?.email ?? "Unassigned",
        updatedAt: t.updatedAt.toISOString()
      }))}
    />
  );
}
