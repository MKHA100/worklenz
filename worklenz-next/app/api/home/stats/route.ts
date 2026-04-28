import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";

const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export async function GET() {
  const profile = await requireUserProfile();
  if (!profile) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);
  const membershipFilter = isUnrestricted ? {} : { members: { some: { userId: profile.id } } };

  const [myTasksCount, submittedCount, projectsCount, attendanceToday, myTasks, recentProjects] =
    await Promise.all([
      prisma.task.count({
        where: {
          assigneeId: profile.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED", "ON_HOLD"] }
        }
      }),
      prisma.task.count({ where: { status: "SUBMITTED" } }),
      prisma.project.count({ where: membershipFilter }),
      prisma.attendance.findFirst({
        where: { userId: profile.id, workDate: { gte: today, lt: tomorrow } }
      }),
      prisma.task.findMany({
        where: {
          assigneeId: profile.id,
          status: { notIn: ["APPROVED", "REJECTED"] }
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          project: { select: { id: true, name: true, code: true } }
        }
      }),
      prisma.project.findMany({
        where: membershipFilter,
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          _count: { select: { tasks: true } }
        }
      })
    ]);

  return Response.json({
    myTasksCount,
    submittedCount,
    projectsCount,
    attendanceStatus: attendanceToday?.status ?? null,
    myTasks: myTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      projectId: t.projectId,
      projectName: t.project.name,
      projectCode: t.project.code,
      updatedAt: t.updatedAt.toISOString()
    })),
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      taskCount: p._count.tasks,
      updatedAt: p.updatedAt.toISOString()
    }))
  });
}
