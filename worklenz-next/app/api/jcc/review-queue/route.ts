import { NextRequest, NextResponse } from "next/server";
import { isOneOfRoles } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";

const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export async function GET(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await isOneOfRoles(["owner", "admin", "managing_director", "senior_qs"]);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const projectId = request.nextUrl.searchParams.get("project_id");
  const cursor = request.nextUrl.searchParams.get("cursor");
  const takeRaw = Number(request.nextUrl.searchParams.get("take") ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(100, Math.floor(takeRaw))) : 50;

  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);

  const tasks = await prisma.task.findMany({
    where: {
      status: "SUBMITTED",
      ...(projectId ? { projectId } : {}),
      ...(isUnrestricted ? {} : { project: { members: { some: { userId: profile.id } } } })
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      assignee: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
      submissions: {
        orderBy: { roundNumber: "asc" },
        include: {
          submittedBy: { select: { id: true, fullName: true, email: true } },
          reviewedBy: { select: { id: true, fullName: true, email: true } },
          attachments: {
            select: {
              id: true,
              fileKey: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              createdAt: true
            }
          }
        }
      }
    },
    orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: take + 1
  });

  const hasMore = tasks.length > take;
  const page = hasMore ? tasks.slice(0, take) : tasks;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    data: page.map((t) => ({
      ...t,
      submittedAt: t.submittedAt?.toISOString() ?? null,
      reviewedAt: t.reviewedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      submissions: t.submissions.map((s) => ({
        ...s,
        submittedAt: s.submittedAt.toISOString(),
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        attachments: s.attachments.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString()
        }))
      }))
    })),
    nextCursor
  });
}
