import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

async function resolveRole(userId: string): Promise<string | null> {
  // Clerk publicMetadata is authoritative when present
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const clerkRole = user.publicMetadata.role;
  if (typeof clerkRole === "string" && clerkRole.length > 0) {
    return clerkRole;
  }
  // Fall back to DB role (set via admin panel or webhook)
  const profile = await prisma.userProfile.findFirst({
    where: { clerkId: userId },
    select: { role: true }
  });
  return profile?.role ?? null;
}

export async function requireOneOfRoles(roles: string[]) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = await resolveRole(userId);

  if (!role || !roles.includes(role)) {
    redirect("/prelim/unauthorized");
  }

  return role;
}

export async function isOneOfRoles(roles: string[]) {
  const { userId } = await auth();
  if (!userId) return false;

  const role = await resolveRole(userId);
  return !!role && roles.includes(role);
}
