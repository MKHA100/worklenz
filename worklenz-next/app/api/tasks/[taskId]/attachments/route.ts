import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { publishRealtimeEvent, publishRealtimeEventToUsers } from "@/lib/realtime/publish";
import { getProjectAffectedUserIds } from "@/lib/realtime/affected-users";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const body = await req.json() as {
    fileKey: string; fileName: string; mimeType?: string; fileSize?: number;
  };

  if (!body.fileKey || !body.fileName) {
    return NextResponse.json({ error: "fileKey and fileName required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      fileKey: body.fileKey,
      fileName: body.fileName,
      mimeType: body.mimeType ?? null,
      fileSize: body.fileSize ?? null,
      uploadedById: profile.id
    }
  });

  void (async () => {
    const affectedUserIds = await getProjectAffectedUserIds(task.projectId, [profile.id]);
    const payload = {
      taskId,
      projectId: task.projectId,
      affectedUserIds,
      actorUserId: profile.id,
      changeType: "attachment_changed" as const,
      action: "added" as const
    };
    await Promise.allSettled([
      publishRealtimeEvent({
        channel: `project:${task.projectId}`,
        event: "task.attachment.changed",
        payload
      }),
      publishRealtimeEventToUsers(affectedUserIds, "task.attachment.changed", payload)
    ]);
  })();

  return NextResponse.json({ attachment }, { status: 201 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get("id");
  if (!attachmentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.taskId !== taskId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attachment.uploadedById !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  if (task) {
    void (async () => {
      const affectedUserIds = await getProjectAffectedUserIds(task.projectId, [profile.id]);
      const payload = {
        taskId,
        projectId: task.projectId,
        affectedUserIds,
        actorUserId: profile.id,
        changeType: "attachment_changed" as const,
        action: "removed" as const
      };
      await Promise.allSettled([
        publishRealtimeEvent({
          channel: `project:${task.projectId}`,
          event: "task.attachment.changed",
          payload
        }),
        publishRealtimeEventToUsers(affectedUserIds, "task.attachment.changed", payload)
      ]);
    })();
  }

  return NextResponse.json({ ok: true });
}
