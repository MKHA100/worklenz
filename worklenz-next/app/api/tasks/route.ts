import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { logInfo } from "@/lib/logging/axiom";

export async function POST(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    assigneeId?: string;
    tradeCode?: string;
    unit?: string;
    plannedRate?: number;
  };

  if (!body.projectId || !body.title?.trim()) {
    return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      title: body.title.trim(),
      description: body.description ?? null,
      status: body.status ?? "ASSIGNED",
      assigneeId: body.assigneeId ?? null,
      tradeCode: body.tradeCode ?? null,
      unit: body.unit ?? null,
      plannedRate: body.plannedRate ?? null
    },
    include: { assignee: { select: { id: true, fullName: true, email: true } } }
  });

  await logInfo("api.tasks.create", { taskId: task.id, projectId: body.projectId, actor: profile.id });
  return NextResponse.json({ task }, { status: 201 });
}
