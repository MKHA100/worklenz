import { NextRequest, NextResponse } from "next/server";
import { isOneOfRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["present", "absent", "half_day", "on_leave"] as const;

function parseDate(value?: string | null) {
  if (!value || !DATE_REGEX.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canViewOthers = await isOneOfRoles(["owner", "admin", "managing_director", "senior_qs"]);
  const query = request.nextUrl.searchParams;
  const start = parseDate(query.get("start")) ?? new Date(new Date().toISOString().slice(0, 10));
  const end = parseDate(query.get("end")) ?? start;
  const requestedUserId = query.get("user_id");
  const targetUserId = canViewOthers ? requestedUserId : profile.id;

  const rows = await prisma.attendance.findMany({
    where: {
      workDate: { gte: start, lte: end },
      ...(targetUserId ? { userId: targetUserId } : {})
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      office: { select: { id: true, code: true, name: true } }
    },
    orderBy: [{ workDate: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    workDate?: string;
    attendance_date?: string;
    status?: string;
    reason?: string;
    officeId?: string;
    check_in_at?: string;
  };

  // Accept both field names
  const dateStr = body.workDate ?? body.attendance_date;
  const workDate = parseDate(dateStr);
  const status = (body.status ?? "").toLowerCase();

  if (!workDate || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "workDate and valid status (present/absent/half_day/on_leave) are required" },
      { status: 400 }
    );
  }

  const checkInTime = body.check_in_at ? new Date(body.check_in_at) : new Date();
  const officeId = body.officeId ?? profile.officeId ?? null;

  const attendance = await prisma.attendance.upsert({
    where: { userId_workDate: { userId: profile.id, workDate } },
    update: {
      status,
      reason: body.reason?.trim() || null,
      checkInTime,
      officeId,
      confirmed: true
    },
    create: {
      userId: profile.id,
      officeId,
      workDate,
      status,
      reason: body.reason?.trim() || null,
      checkInTime,
      confirmed: true
    }
  });

  return NextResponse.json({ attendance });
}
