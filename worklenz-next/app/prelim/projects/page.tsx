import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  await requireUserProfile();

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      office: { select: { id: true, name: true, code: true } },
      _count: { select: { tasks: true } }
    }
  });

  return (
    <ProjectsClient
      initialProjects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        officeName: p.office?.name ?? null,
        officeCode: p.office?.code ?? null,
        taskCount: p._count.tasks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      }))}
    />
  );
}
