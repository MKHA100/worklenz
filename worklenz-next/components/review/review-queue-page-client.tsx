"use client";

import { useState } from "react";
import {
  Table, Tag, Button, Input, Typography, Flex, Avatar,
  Space, Badge, App, Tooltip, Card, Statistic, Row, Col
} from "antd";
import {
  CheckOutlined, RollbackOutlined, StopOutlined, PauseOutlined,
  UserOutlined, ClockCircleOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

type Task = {
  id: string; title: string; description: string | null; status: string;
  revisionCount: number; submittedAt: string | null; reviewComment: string | null;
  timeSpentMinute: number;
  project: { id: string; name: string; code: string };
  assignee: { id: string; fullName: string | null; email: string } | null;
};

type Props = { initialTasks: Task[] };

export function ReviewQueuePageClient({ initialTasks }: Props) {
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function action(taskId: string, status: string) {
    setLoading((p) => ({ ...p, [taskId]: true }));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewComment: comments[taskId] ?? null })
      });
      if (!res.ok) throw new Error("Update failed");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      message.success(`Task ${status.toLowerCase()}`);
    } catch { message.error("Action failed"); }
    finally { setLoading((p) => ({ ...p, [taskId]: false })); }
  }

  const columns: ColumnsType<Task> = [
    {
      title: "Task", key: "task",
      render: (_, t) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{t.title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t.project.code} — {t.project.name}
          </Text>
          {t.revisionCount > 0 && (
            <Badge count={t.revisionCount} color="orange" style={{ marginLeft: 8 }} />
          )}
        </div>
      )
    },
    {
      title: "Assignee", key: "assignee", width: 180,
      render: (_, t) => t.assignee ? (
        <Flex gap={6} align="center">
          <Avatar size={28} icon={<UserOutlined />} style={{ background: "#1677ff" }} />
          <div>
            <Text style={{ fontSize: 13 }}>{t.assignee.fullName ?? t.assignee.email}</Text>
          </div>
        </Flex>
      ) : <Text type="secondary">—</Text>
    },
    {
      title: "Submitted", key: "submittedAt", width: 130,
      render: (_, t) => t.submittedAt ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(t.submittedAt).toLocaleDateString()}
        </Text>
      ) : "—"
    },
    {
      title: "Time", key: "time", width: 90,
      render: (_, t) => {
        const h = Math.floor(t.timeSpentMinute / 60);
        const m = t.timeSpentMinute % 60;
        return <Text type="secondary" style={{ fontSize: 12 }}>{h}h {m}m</Text>;
      }
    },
    {
      title: "Comment", key: "comment", width: 200,
      render: (_, t) => (
        <Input
          size="small"
          placeholder="Review comment..."
          value={comments[t.id] ?? ""}
          onChange={(e) => setComments((p) => ({ ...p, [t.id]: e.target.value }))}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    {
      title: "Actions", key: "actions", width: 200,
      render: (_, t) => (
        <Space size={4}>
          <Tooltip title="Approve">
            <Button
              size="small" type="primary" icon={<CheckOutlined />}
              loading={loading[t.id]}
              onClick={() => action(t.id, "APPROVED")}
              style={{ background: "#52c41a", borderColor: "#52c41a" }}
            />
          </Tooltip>
          <Tooltip title="Revision Required">
            <Button
              size="small" icon={<RollbackOutlined />}
              loading={loading[t.id]}
              onClick={() => action(t.id, "REVISION_REQUIRED")}
              style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
            />
          </Tooltip>
          <Tooltip title="On Hold">
            <Button
              size="small" icon={<PauseOutlined />}
              loading={loading[t.id]}
              onClick={() => action(t.id, "ON_HOLD")}
            />
          </Tooltip>
          <Tooltip title="Reject">
            <Button
              size="small" danger icon={<StopOutlined />}
              loading={loading[t.id]}
              onClick={() => action(t.id, "REJECTED")}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Review Queue</Title>
          <Text type="secondary">Tasks awaiting Senior QS review</Text>
        </div>
        <Badge count={tasks.length} color={tasks.length > 0 ? "#fa8c16" : "#52c41a"} overflowCount={99}>
          <ClockCircleOutlined style={{ fontSize: 24 }} />
        </Badge>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card bordered={false} style={{ textAlign: "center" }}>
            <Statistic title="Awaiting Review" value={tasks.length} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ textAlign: "center" }}>
            <Statistic
              title="With Revisions"
              value={tasks.filter((t) => t.revisionCount > 0).length}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card bordered={false} style={{ textAlign: "center" }}>
            <Statistic
              title="Total Hours"
              value={(tasks.reduce((s, t) => s + t.timeSpentMinute, 0) / 60).toFixed(1)}
              suffix="h"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} tasks` }}
        locale={{ emptyText: "No tasks awaiting review." }}
        size="middle"
      />
    </div>
  );
}
