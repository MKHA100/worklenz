import { NextRequest, NextResponse } from "next/server";
import { isOneOfRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { logError, logInfo } from "@/lib/logging/axiom";

export async function GET(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const officeId = request.nextUrl.searchParams.get("office_id");

  const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];
  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);

  try {
    const where: Record<string, unknown> = officeId ? { officeId } : {};

    if (!isUnrestricted) {
      where.members = { some: { userId: profile.id } };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        office: { select: { id: true, code: true, name: true } },
        _count: { select: { tasks: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    await logError("api.projects.list.error", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      code?: string;
      office_id?: string;
    };

    const name = body.name?.trim();
    const code = body.code?.trim();
    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const managingDirectors = await prisma.userProfile.findMany({
      where: { role: "managing_director" },
      select: { id: true }
    });

    const memberIds = Array.from(
      new Set([profile.id, ...managingDirectors.map((m) => m.id)])
    );

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name,
          code: code.toUpperCase(),
          officeId: body.office_id ?? null
        }
      });
      await tx.projectMember.createMany({
        data: memberIds.map((userId) => ({ projectId: created.id, userId })),
        skipDuplicates: true
      });
      return created;
    });

    await logInfo("api.projects.create", { projectId: project.id, actor: profile.id });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    await logError("api.projects.create.error", {
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
