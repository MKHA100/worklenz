import { ReactNode } from "react";
import { requireUserProfile } from "@/lib/users/profile";
import { WorklenzNav } from "@/components/layout/worklenz-nav";

export default async function WorklenzLayout({ children }: { children: ReactNode }) {
  const profile = await requireUserProfile();
  const role = profile?.role ?? "qs";

  return <WorklenzNav role={role}>{children}</WorklenzNav>;
}
