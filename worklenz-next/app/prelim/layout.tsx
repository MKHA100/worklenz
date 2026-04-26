import { ReactNode } from "react";
import { requireUserProfile } from "@/lib/users/profile";
import { PrelimNav } from "@/components/layout/prelim-nav";

export default async function PrelimLayout({ children }: { children: ReactNode }) {
  const profile = await requireUserProfile();
  const role = profile?.role ?? "qs";

  return <PrelimNav role={role}>{children}</PrelimNav>;
}
