import { prisma } from "@/lib/db/prisma";
import { requireUserProfile } from "@/lib/users/profile";
import { Typography, Tag } from "antd";
import { GanttChart, type GanttTask } from "@/components/gantt/gantt-chart";
import { notFound } from "next/navigation";

const { Title, Text } = Typography;

const UNRESTRICTED_ROLES = ["owner", "admin", "managing_director"];

export default async function GanttPage() {
  const profile = await requireUserProfile();
  if (!profile) notFound();

  const isUnrestricted = UNRESTRICTED_ROLES.includes(profile.role);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        ...(isUnrestricted ? [{}] : []),
        { taskMembers: { some: { userId: profile.id } } },
        { assigneeId: profile.id }
      ],
      AND: [
        {
          OR: [
            { startDate: { not: null } },
            { dueDate: { not: null } }
          ]
        }
      ]
    },
    include: {
      project: { select: { name: true, code: true } },
      assignee: { select: { fullName: true, email: true } },
      taskMembers: { include: { user: { select: { fullName: true, email: true } } } }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });

  const ganttTasks: GanttTask[] = tasks.map((t) => {
    const primaryAssignee = t.taskMembers[0]?.user ?? t.assignee;
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority ?? "NORMAL",
      startDate: t.startDate?.toISOString() ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      assigneeName: primaryAssignee ? (primaryAssignee.fullName ?? primaryAssignee.email) : null,
      projectName: `${t.project.code} — ${t.project.name}`
    };
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Gantt Chart</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tasks with start or due dates — {ganttTasks.length} task{ganttTasks.length !== 1 ? "s" : ""} visible
        </Text>
      </div>

      <GanttChart tasks={ganttTasks} groupByProject />
    </div>
  );
}
