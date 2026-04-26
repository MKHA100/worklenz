"use client";

import { Row, Col, Card, Statistic, Table, Tag, Typography, Flex, Progress } from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, ProjectOutlined,
  TeamOutlined, RollbackOutlined, BarChartOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "blue", IN_PROGRESS: "processing", SUBMITTED: "purple",
  REVISION_REQUIRED: "orange", ON_HOLD: "default", APPROVED: "success",
  REJECTED: "error", QUERY_RAISED: "gold", EXTENSION_REQUESTED: "cyan"
};
const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned", IN_PROGRESS: "In Progress", SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision Required", ON_HOLD: "On Hold",
  APPROVED: "Approved", REJECTED: "Rejected",
  QUERY_RAISED: "Query Raised", EXTENSION_REQUESTED: "Extension Requested"
};

type Props = {
  stats: {
    totalTasks: number; approvedTasks: number; submittedTasks: number;
    revisionTasks: number; totalProjects: number; activeUsers: number;
  };
  tasksByStatus: { status: string; count: number }[];
  recentActivity: {
    id: string; title: string; status: string;
    projectName: string; projectCode: string;
    assigneeName: string; updatedAt: string;
  }[];
};

const activityCols: ColumnsType<Props["recentActivity"][0]> = [
  {
    title: "Task", dataIndex: "title", key: "title",
    render: (t, r) => (
      <div>
        <Text strong style={{ fontSize: 13 }}>{t}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 11 }}>{r.projectCode} — {r.projectName}</Text>
      </div>
    )
  },
  {
    title: "Status", dataIndex: "status", key: "status", width: 160,
    render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{STATUS_LABELS[s] ?? s}</Tag>
  },
  {
    title: "Assignee", dataIndex: "assigneeName", key: "assignee", width: 160,
    render: (n: string) => <Text style={{ fontSize: 13 }}>{n}</Text>
  },
  {
    title: "Updated", dataIndex: "updatedAt", key: "updatedAt", width: 120,
    render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString()}</Text>
  }
];

export function ReportingClient({ stats, tasksByStatus, recentActivity }: Props) {
  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.approvedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div>
      <Flex align="center" gap={8} style={{ marginBottom: 24 }}>
        <BarChartOutlined style={{ fontSize: 20, color: "#1677ff" }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>Reporting Overview</Title>
          <Text type="secondary">This month&apos;s activity summary</Text>
        </div>
      </Flex>

      {/* KPI Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Total Tasks" value={stats.totalTasks} prefix={<ClockCircleOutlined />} styles={{ content: { color: "#1677ff" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Approved" value={stats.approvedTasks} prefix={<CheckCircleOutlined />} styles={{ content: { color: "#52c41a" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Pending Review" value={stats.submittedTasks} styles={{ content: { color: "#722ed1" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Revision Required" value={stats.revisionTasks} prefix={<RollbackOutlined />} styles={{ content: { color: "#fa8c16" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Projects" value={stats.totalProjects} prefix={<ProjectOutlined />} styles={{ content: { color: "#13c2c2" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card variant="borderless">
            <Statistic title="Members" value={stats.activeUsers} prefix={<TeamOutlined />} styles={{ content: { color: "#eb2f96" } }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Completion rate */}
        <Col xs={24} lg={8}>
          <Card title="Completion Rate" variant="borderless">
            <Flex vertical align="center" gap={16} style={{ padding: "16px 0" }}>
              <Progress
                type="circle"
                percent={completionRate}
                strokeColor={{ "0%": "#1677ff", "100%": "#52c41a" }}
                size={160}
              />
              <Text type="secondary">{stats.approvedTasks} of {stats.totalTasks} tasks approved</Text>
            </Flex>
          </Card>

          <Card title="Tasks by Status" variant="borderless" style={{ marginTop: 16 }}>
            <Flex vertical gap={10}>
              {tasksByStatus.map(({ status, count }) => (
                <div key={status}>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}>
                    <Tag color={STATUS_COLORS[status] ?? "default"} style={{ margin: 0 }}>
                      {STATUS_LABELS[status] ?? status}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{count}</Text>
                  </Flex>
                  <Progress
                    percent={stats.totalTasks > 0 ? Math.round((count / stats.totalTasks) * 100) : 0}
                    showInfo={false}
                    size="small"
                    strokeColor={
                      STATUS_COLORS[status] === "success" ? "#52c41a" :
                      STATUS_COLORS[status] === "error" ? "#ff4d4f" :
                      STATUS_COLORS[status] === "orange" ? "#fa8c16" : "#1677ff"
                    }
                  />
                </div>
              ))}
            </Flex>
          </Card>
        </Col>

        {/* Recent activity */}
        <Col xs={24} lg={16}>
          <Card title="Recent Activity (This Month)" variant="borderless">
            <Table
              dataSource={recentActivity}
              columns={activityCols}
              rowKey="id"
              pagination={{ pageSize: 8, size: "small" }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
