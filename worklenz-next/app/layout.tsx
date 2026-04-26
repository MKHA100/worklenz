import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelim",
  description: "Prelim — project management built on Next.js, Clerk, and Prisma"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AntdRegistry>{children}</AntdRegistry>
        </body>
      </html>
    </ClerkProvider>
  );
}
