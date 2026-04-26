import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { isOneOfRoles } from "@/lib/auth/roles";

type RouteContext = { params: Promise<{ projectId: string }> };

const MANAGER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    orderBy: { addedAt: "asc" }
  });

  return NextResponse.json({ members: members.map((m) => ({ ...m.user, addedAt: m.addedAt })) });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = await isOneOfRoles(MANAGER_ROLES);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const body = await req.json() as { userId: string };
  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: body.userId } },
    create: { projectId, userId: body.userId },
    update: {},
    include: { user: { select: { id: true, fullName: true, email: true, role: true } } }
  });

  return NextResponse.json({ member: { ...member.user, addedAt: member.addedAt } }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = await isOneOfRoles(MANAGER_ROLES);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Managing directors cannot be removed
  const target = await prisma.userProfile.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role === "managing_director") {
    return NextResponse.json({ error: "Managing directors cannot be removed from projects" }, { status: 409 });
  }

  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  return NextResponse.json({ ok: true });
}
