import { redirect } from "next/navigation";
import { requireUserProfile } from "@/lib/users/profile";

async function resolveRole(): Promise<string | null> {
  // Resolve roles from local DB to avoid Clerk Backend API calls on hot paths.
  const profile = await requireUserProfile();
  if (!profile) return null;
  return profile?.role ?? null;
}

export async function requireOneOfRoles(roles: string[]) {
  const profile = await requireUserProfile();
  if (!profile) {
    redirect("/sign-in");
  }

  if (!roles.includes(profile.role)) {
    redirect("/prelim/unauthorized");
  }

  return profile.role;
}

export async function isOneOfRoles(roles: string[]) {
  const role = await resolveRole();
  return !!role && roles.includes(role);
}
