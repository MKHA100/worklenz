import { prisma } from "@/lib/db/prisma";

export async function getProjectAffectedUserIds(projectId: string, extraUserIds: Array<string | null | undefined> = []) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  });

  return Array.from(
    new Set([
      ...members.map((m) => m.userId),
      ...extraUserIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    ])
  );
}
