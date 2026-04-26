import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { AttendancePageClient } from "@/components/attendance/attendance-page-client";

const SENIOR_ROLES = ["owner", "admin", "managing_director", "senior_qs"];

export default async function AttendancePage() {
  const profile = await requireUserProfile();
  if (!profile) return null;

  const isSenior = SENIOR_ROLES.includes(profile.role);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [records, offices, allUsers, monthlyGroups, todayRecords] = await Promise.all([
    // Personal records
    prisma.attendance.findMany({
      where: { userId: profile.id },
      orderBy: { workDate: "desc" },
      take: 30,
      include: { office: { select: { id: true, name: true, code: true } } }
    }),
    prisma.office.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true }
    }),
    // Team data — only fetched for seniors
    isSenior
      ? prisma.userProfile.findMany({
          select: { id: true, fullName: true, email: true, role: true }
        })
      : Promise.resolve([]),
    isSenior
      ? prisma.attendance.groupBy({
          by: ["userId", "status"],
          _count: { _all: true },
          where: { workDate: { gte: startOfMonth } }
        })
      : Promise.resolve([]),
    isSenior
      ? prisma.attendance.findMany({
          where: { workDate: { gte: today, lt: tomorrow } },
          select: { userId: true, status: true }
        })
      : Promise.resolve([])
  ]);

  // Build per-user monthly stats
  const monthlyStats: Record<string, Record<string, number>> = {};
  for (const g of monthlyGroups) {
    if (!monthlyStats[g.userId]) monthlyStats[g.userId] = {};
    monthlyStats[g.userId][g.status] = g._count._all;
  }

  const todayByUser: Record<string, string> = {};
  for (const t of todayRecords) {
    todayByUser[t.userId] = t.status;
  }

  return (
    <AttendancePageClient
      userRole={profile.role}
      records={records.map((r) => ({
        id: r.id,
        workDate: r.workDate.toISOString().slice(0, 10),
        status: r.status,
        checkInTime: r.checkInTime.toISOString().slice(11, 16),
        reason: r.reason,
        officeName: r.office?.name ?? null
      }))}
      offices={offices}
      teamData={isSenior ? {
        users: allUsers,
        monthlyStats,
        todayByUser,
        monthLabel: startOfMonth.toLocaleString("default", { month: "long", year: "numeric" })
      } : null}
    />
  );
}
