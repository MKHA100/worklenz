import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { AttendancePageClient } from "@/components/attendance/attendance-page-client";

export default async function AttendancePage() {
  const profile = await requireUserProfile();
  if (!profile) return null;

  const [records, offices] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: profile.id },
      orderBy: { workDate: "desc" },
      take: 30,
      include: { office: { select: { id: true, name: true, code: true } } }
    }),
    prisma.office.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true }
    })
  ]);

  return (
    <AttendancePageClient
      records={records.map((r) => ({
        id: r.id,
        workDate: r.workDate.toISOString().slice(0, 10),
        status: r.status,
        checkInTime: r.checkInTime.toISOString().slice(11, 16),
        reason: r.reason,
        officeName: r.office?.name ?? null
      }))}
      offices={offices}
    />
  );
}
