import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

// cache() deduplicates calls within the same server request — layout.tsx + page.tsx
// both call this, but DB is only hit once per request.
export const requireUserProfile = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  // Hot path: resolve from our DB first and avoid Clerk Backend API calls.
  const existing = await prisma.userProfile.findUnique({ where: { clerkId: userId } });
  if (existing) {
    return existing;
  }

  // Bootstrap path only: fallback to Clerk user fetch when no local profile exists.
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Authenticated user has no email address.");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
  const metaRole = user.publicMetadata.role;
  const explicitRole = typeof metaRole === "string" ? metaRole : null;

  return prisma.userProfile.upsert({
    where: { email },
    update: { clerkId: userId, fullName, ...(explicitRole ? { role: explicitRole } : {}) },
    create: { clerkId: userId, email, fullName, role: explicitRole ?? "qs" }
  });
});
