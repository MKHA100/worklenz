"use client";

import Link from "next/link";
import {
  Row, Col, Card, Table, Tag, Typography, Flex, Badge, Button, Empty
} from "antd";
import {
  ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined, CalendarOutlined,
  ArrowRightOutlined, ReloadOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "blue",
  IN_PROGRESS: "processing",
  SUBMITTED: "purple",
  REVISION_REQUIRED: "orange",
  ON_HOLD: "default",
  APPROVED: "success",
  REJECTED: "error",
  QUERY_RAISED: "gold",
  EXTENSION_REQUESTED: "cyan"
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision Required",
  ON_HOLD: "On Hold",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  QUERY_RAISED: "Query Raised",
  EXTENSION_REQUESTED: "Extension Requested"
};

type MyTask = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  updatedAt: string;
};

type RecentProject = {
  id: string;
  name: string;
  code: string;
  taskCount: number;
  updatedAt: string;
};

type Stats = {
  myTasksCount: number;
  submittedCount: number;
  projectsCount: number;
  attendanceStatus: string | null;
};

type Props = {
  greeting: string;
  dateStr: string;
  stats: Stats;
  myTasks: MyTask[];
  recentProjects: RecentProject[];
};

const taskColumns: ColumnsType<MyTask> = [
  {
    title: "Task",
    dataIndex: "title",
    key: "title",
    render: (title, record) => (
      <Link href={`/worklenz/projects/${record.projectId}`} style={{ fontWeight: 500 }}>
        {title}
      </Link>
    )
  },
  {
    title: "Project",
    key: "project",
    render: (_, record) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {record.projectCode} — {record.projectName}
      </Text>
    )
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <Tag color={STATUS_COLORS[status] ?? "default"} style={{ fontSize: 11 }}>
        {STATUS_LABELS[status] ?? status}
      </Tag>
    )
  }
];

export function HomeClient({ greeting, dateStr, stats, myTasks, recentProjects }: Props) {
  const attendanceBadge = stats.attendanceStatus
    ? { status: "success" as const, text: stats.attendanceStatus.replace("_", " ") }
    : { status: "error" as const, text: "Not logged" };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Greeting */}
      <Flex vertical align="center" gap={4} style={{ marginBottom: 32 }}>
        <Title level={3} style={{ marginBottom: 0, fontWeight: 500 }}>
          {greeting}
        </Title>
        <Text style={{ color: "#1677ff", fontSize: 14 }}>{dateStr}</Text>
      </Flex>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderLeft: "4px solid #1677ff" }}>
            <Flex gap={12} align="center">
              <ClockCircleOutlined style={{ fontSize: 24, color: "#1677ff" }} />
              <div>
                <Title level={2} style={{ margin: 0, color: "#1677ff" }}>
                  {stats.myTasksCount}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>My Open Tasks</Text>
              </div>
            </Flex>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderLeft: "4px solid #fa8c16" }}>
            <Flex gap={12} align="center">
              <CheckCircleOutlined style={{ fontSize: 24, color: "#fa8c16" }} />
              <div>
                <Title level={2} style={{ margin: 0, color: "#fa8c16" }}>
                  {stats.submittedCount}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>Pending Review</Text>
              </div>
            </Flex>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderLeft: "4px solid #52c41a" }}>
            <Flex gap={12} align="center">
              <ProjectOutlined style={{ fontSize: 24, color: "#52c41a" }} />
              <div>
                <Title level={2} style={{ margin: 0, color: "#52c41a" }}>
                  {stats.projectsCount}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>Projects</Text>
              </div>
            </Flex>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderLeft: "4px solid #722ed1" }}>
            <Flex gap={12} align="center">
              <CalendarOutlined style={{ fontSize: 24, color: "#722ed1" }} />
              <div>
                <Badge status={attendanceBadge.status} />
                <Text style={{ fontSize: 13, textTransform: "capitalize" }}>
                  {attendanceBadge.text}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Today&apos;s Attendance</Text>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* My Tasks */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Text strong>My Tasks</Text>
                <Link href="/worklenz/projects">
                  <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                    View all projects
                  </Button>
                </Link>
              </Flex>
            }
            bordered={false}
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            {myTasks.length === 0 ? (
              <Empty description="No active tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                dataSource={myTasks}
                columns={taskColumns}
                rowKey="id"
                pagination={{ pageSize: 8, size: "small" }}
                size="small"
              />
            )}
          </Card>
        </Col>

        {/* Recent Projects */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Text strong>Recent Projects</Text>
                <Link href="/worklenz/projects">
                  <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                    All
                  </Button>
                </Link>
              </Flex>
            }
            bordered={false}
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            {recentProjects.length === 0 ? (
              <Empty description="No projects yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Flex vertical gap={8}>
                {recentProjects.map((p) => (
                  <Link key={p.id} href={`/worklenz/projects/${p.id}`}>
                    <Card
                      size="small"
                      hoverable
                      bordered
                      style={{ borderRadius: 6 }}
                    >
                      <Flex justify="space-between" align="center">
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>{p.code}</Text>
                        </div>
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          {p.taskCount} tasks
                        </Tag>
                      </Flex>
                    </Card>
                  </Link>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
