import { requireUserProfile } from "@/lib/users/profile";
import { prisma } from "@/lib/db/prisma";
import { ProjectsClient } from "@/components/projects/projects-client";

const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export default async function ProjectsPage() {
  const profile = await requireUserProfile();
  if (!profile) return null;

  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);

  const [projects, offices] = await Promise.all([
    prisma.project.findMany({
      where: isUnrestricted ? {} : { members: { some: { userId: profile.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        office: { select: { id: true, name: true, code: true } },
        _count: { select: { tasks: true } }
      }
    }),
    prisma.office.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <ProjectsClient
      currentUserId={profile.id}
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
      offices={offices.map((o) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        city: o.city,
        country: o.country
      }))}
    />
  );
}
