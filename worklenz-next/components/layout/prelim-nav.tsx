"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";
import { ConfigProvider, Layout, Menu, Flex, App, theme } from "antd";
import {
  HomeOutlined, ProjectOutlined, ScheduleOutlined,
  CheckSquareOutlined, BarChartOutlined
} from "@ant-design/icons";

const { Header, Content } = Layout;

// role → which nav keys are visible
const ROLE_ACCESS: Record<string, string[]> = {
  owner:            ["home", "projects", "attendance", "review-queue", "reporting"],
  admin:            ["home", "projects", "attendance", "review-queue", "reporting"],
  managing_director:["home", "projects", "attendance", "review-queue", "reporting"],
  senior_qs:        ["home", "projects", "attendance", "review-queue", "reporting"],
  qs:               ["home", "projects", "attendance"]
};

const ALL_NAV = [
  { key: "home",         label: "Home",         href: "/prelim/home",               icon: <HomeOutlined /> },
  { key: "projects",     label: "Projects",      href: "/prelim/projects",           icon: <ProjectOutlined /> },
  { key: "attendance",   label: "Attendance",    href: "/prelim/attendance",         icon: <ScheduleOutlined /> },
  { key: "review-queue", label: "Review Queue",  href: "/prelim/review-queue",       icon: <CheckSquareOutlined /> },
  { key: "reporting",    label: "Reporting",     href: "/prelim/reporting/overview", icon: <BarChartOutlined /> }
];

type Props = { role: string; children: ReactNode };

export function PrelimNav({ role, children }: Props) {
  const pathname = usePathname();
  const segment = pathname.split("/prelim/")[1]?.split("/")[0] ?? "home";

  const allowed = ROLE_ACCESS[role] ?? ROLE_ACCESS["qs"];
  const visibleNav = ALL_NAV.filter((n) => allowed.includes(n.key));

  const menuItems = visibleNav.map((item) => ({
    key: item.key,
    icon: item.icon,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label: <Link href={item.href as any}>{item.label}</Link>
  }));

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        },
        components: {
          Layout: { headerBg: "#ffffff", headerHeight: 64 },
          Menu: { horizontalItemSelectedColor: "#1677ff", itemHoverColor: "#1677ff" }
        }
      }}
    >
      {/* App wrapper provides proper context for message/notification/modal */}
      <App>
        <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
          <Header
            style={{
              position: "sticky", top: 0, zIndex: 999, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 24px", borderBottom: "1px solid #f0f0f0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            {/* Logo */}
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={"/prelim/home" as any}
              style={{
                fontSize: 20, fontWeight: 800, color: "#1677ff",
                textDecoration: "none", letterSpacing: "-0.5px",
                whiteSpace: "nowrap", marginRight: 32
              }}
            >
              Prelim
            </Link>

            {/* Nav menu — filtered by role */}
            <Menu
              mode="horizontal"
              selectedKeys={[segment]}
              items={menuItems}
              style={{ flex: 1, border: "none", background: "transparent", minWidth: 0 }}
            />

            {/* Right: User button */}
            <Flex align="center" gap={16} style={{ flexShrink: 0 }}>
              <UserButton />
            </Flex>
          </Header>

          <Content
            style={{
              maxWidth: 1400, width: "100%",
              margin: "0 auto", padding: "24px 24px"
            }}
          >
            {children}
          </Content>
        </Layout>
      </App>
    </ConfigProvider>
  );
}
