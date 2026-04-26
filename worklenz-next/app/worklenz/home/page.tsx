import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { HomeClient } from "@/components/home/home-client";

export default async function HomePage() {
  const profile = await requireUserProfile();
  if (!profile) return null;

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [myTasksCount, submittedCount, projectsCount, attendanceToday, myTasks, recentProjects] =
    await Promise.all([
      prisma.task.count({
        where: {
          assigneeId: profile.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED", "ON_HOLD"] }
        }
      }),
      prisma.task.count({ where: { status: "SUBMITTED" } }),
      prisma.project.count(),
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
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          _count: { select: { tasks: true } }
        }
      })
    ]);

  const firstName = profile.fullName?.split(" ")[0] ?? profile.email.split("@")[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${firstName}!`
      : hour < 18
        ? `Good afternoon, ${firstName}!`
        : `Good evening, ${firstName}!`;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <HomeClient
      greeting={greeting}
      dateStr={dateStr}
      stats={{
        myTasksCount,
        submittedCount,
        projectsCount,
        attendanceStatus: attendanceToday?.status ?? null
      }}
      myTasks={myTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        projectId: t.projectId,
        projectName: t.project.name,
        projectCode: t.project.code,
        updatedAt: t.updatedAt.toISOString()
      }))}
      recentProjects={recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        taskCount: p._count.tasks,
        updatedAt: p.updatedAt.toISOString()
      }))}
    />
  );
}
