import { ReactNode } from "react";
import { requireUserProfile } from "@/lib/users/profile";
import { PrelimNav } from "@/components/layout/prelim-nav";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function PrelimLayout({ children }: { children: ReactNode }) {
  const profile = await requireUserProfile();
  const role = profile?.role ?? "qs";

  return (
    <QueryProvider>
      <PrelimNav role={role}>{children}</PrelimNav>
    </QueryProvider>
  );
}
