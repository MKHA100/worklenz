"use client";

import { useState } from "react";
import {
  Table, Tag, Button, Input, Typography, Flex, Avatar,
  Space, Badge, App, Tooltip, Card, Statistic, Row, Col,
  Drawer, Descriptions, Divider, Alert
} from "antd";
import {
  CheckOutlined, RollbackOutlined, StopOutlined, PauseOutlined,
  UserOutlined, ClockCircleOutlined, PaperClipOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

import { SubmissionTimeline } from "./submission-timeline";
import type { Submission } from "./submission-timeline";


type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  revisionCount: number;
  submittedAt: string | null;
  submissionNote: string | null;
  reviewComment: string | null;
  timeSpentMinute: number;
  reviewerId: string | null;
  project: { id: string; name: string; code: string };
  assignee: { id: string; fullName: string | null; email: string } | null;
  reviewer: { id: string; fullName: string | null; email: string } | null;
  submissions: Submission[];
};

type Props = { initialTasks: Task[] };

function waitingLabel(submittedAt: string | null) {
  if (!submittedAt) return "—";
  const diffMs = Date.now() - new Date(submittedAt).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "< 1h ago";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function urgencyColor(submittedAt: string | null) {
  if (!submittedAt) return "#8c8c8c";
  const diffH = (Date.now() - new Date(submittedAt).getTime()) / 3600000;
  if (diffH > 48) return "#f5222d";
  if (diffH > 24) return "#fa8c16";
  return "#52c41a";
}

export function ReviewQueuePageClient({ initialTasks }: Props) {
  const { message } = App.useApp();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selected, setSelected] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitReview(status: string) {
    if (!selected) return;
    if ((status === "REVISION_REQUIRED" || status === "REJECTED") && !comment.trim()) {
      message.warning("Comment required for revision / rejection");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewComment: comment.trim() || null })
      });
      if (!res.ok) throw new Error("Update failed");
      setTasks((prev) => prev.filter((t) => t.id !== selected.id));
      message.success(`Task marked as ${status.replace(/_/g, " ").toLowerCase()}`);
      setSelected(null);
      setComment("");
    } catch {
      message.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  function openTask(task: Task) {
    setSelected(task);
    setComment(task.reviewComment ?? "");
  }

  const columns: ColumnsType<Task> = [
    {
      title: "Task", key: "task",
      render: (_, t) => (
        <div>
          <Flex gap={6} align="center" wrap="wrap">
            <Text strong style={{ fontSize: 14 }}>{t.title}</Text>
            {t.revisionCount > 0 && (
              <Tag color="orange" style={{ fontSize: 11 }}>Rev ×{t.revisionCount}</Tag>
            )}
            {t.submissions.some((s) => s.attachments.length > 0) && (
              <Tag icon={<PaperClipOutlined />} color="blue" style={{ fontSize: 11 }}>
                {t.submissions.reduce((n, s) => n + s.attachments.length, 0)}
              </Tag>
            )}
          </Flex>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t.project.code} — {t.project.name}
          </Text>
          {t.submissionNote && (
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                "{t.submissionNote.slice(0, 60)}{t.submissionNote.length > 60 ? "…" : ""}"
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Submitted by", key: "assignee", width: 180,
      render: (_, t) => (
        <div>
          {t.assignee ? (
            <Flex gap={6} align="center">
              <Avatar size={26} icon={<UserOutlined />} style={{ background: "#1677ff", flexShrink: 0 }} />
              <Text style={{ fontSize: 13 }}>{t.assignee.fullName ?? t.assignee.email}</Text>
            </Flex>
          ) : <Text type="secondary">—</Text>}
          {t.reviewer && (
            <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: "block" }}>
              → {t.reviewer.fullName ?? t.reviewer.email}
            </Text>
          )}
        </div>
      )
    },
    {
      title: "Waiting", key: "waiting", width: 110,
      render: (_, t) => (
        <div>
          <Text style={{ fontSize: 12, color: urgencyColor(t.submittedAt), fontWeight: 600 }}>
            {waitingLabel(t.submittedAt)}
          </Text>
          {t.submittedAt && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(t.submittedAt).toLocaleDateString()}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Time", key: "time", width: 80,
      render: (_, t) => {
        const h = Math.floor(t.timeSpentMinute / 60);
        const m = t.timeSpentMinute % 60;
        return <Text type="secondary" style={{ fontSize: 12 }}>{h}h {m}m</Text>;
      }
    },
    {
      title: "", key: "action", width: 90,
      render: (_, t) => (
        <Button size="small" type="primary" onClick={() => openTask(t)}>
          Review
        </Button>
      )
    }
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Review Queue</Title>
          <Text type="secondary">Tasks awaiting Senior QS review — oldest first</Text>
        </div>
        <Badge count={tasks.length} color={tasks.length > 0 ? "#fa8c16" : "#52c41a"} overflowCount={99}>
          <ClockCircleOutlined style={{ fontSize: 24 }} />
        </Badge>
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card variant="borderless" style={{ textAlign: "center" }}>
            <Statistic title="Awaiting Review" value={tasks.length} styles={{ content: { color: "#fa8c16" } }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card variant="borderless" style={{ textAlign: "center" }}>
            <Statistic
              title="With Revisions"
              value={tasks.filter((t) => t.revisionCount > 0).length}
              styles={{ content: { color: "#1677ff" } }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card variant="borderless" style={{ textAlign: "center" }}>
            <Statistic
              title="With Documents"
              value={tasks.filter((t) => t.submissions.some((s) => s.attachments.length > 0)).length}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        onRow={(t) => ({ onClick: () => openTask(t), style: { cursor: "pointer" } })}
        pagination={{ pageSize: 20, showTotal: (total) => `${total} tasks` }}
        locale={{ emptyText: "No tasks awaiting review." }}
        size="middle"
      />

      <Drawer
        title={
          selected ? (
            <Flex gap={8} align="center">
              <span style={{ fontWeight: 600 }}>{selected.title}</span>
              {selected.revisionCount > 0 && (
                <Tag color="orange">Revision ×{selected.revisionCount}</Tag>
              )}
            </Flex>
          ) : "Review Task"
        }
        open={!!selected}
        onClose={() => setSelected(null)}
        styles={{ wrapper: { width: 600 } }}
        footer={
          selected && (
            <Space wrap>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={loading}
                onClick={() => submitReview("APPROVED")}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
              >
                Approve
              </Button>
              <Button
                icon={<RollbackOutlined />}
                loading={loading}
                onClick={() => submitReview("REVISION_REQUIRED")}
                style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
              >
                Revision Required
              </Button>
              <Button
                icon={<PauseOutlined />}
                loading={loading}
                onClick={() => submitReview("ON_HOLD")}
              >
                On Hold
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                loading={loading}
                onClick={() => submitReview("REJECTED")}
              >
                Reject
              </Button>
            </Space>
          )
        }
      >
        {selected && (
          <div>
            {/* Meta */}
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Project">
                <Text strong>{selected.project.code}</Text> — {selected.project.name}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted by">
                {selected.assignee?.fullName ?? selected.assignee?.email ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {selected.submittedAt
                  ? `${new Date(selected.submittedAt).toLocaleString()} (${waitingLabel(selected.submittedAt)})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Time spent">
                {Math.floor(selected.timeSpentMinute / 60)}h {selected.timeSpentMinute % 60}m
              </Descriptions.Item>
              {selected.reviewer && (
                <Descriptions.Item label="Assigned reviewer" span={2}>
                  {selected.reviewer.fullName ?? selected.reviewer.email}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Task description */}
            {selected.description && (
              <>
                <Divider orientationMargin={0} style={{ fontSize: 13 }}>Task Description</Divider>
                <Paragraph style={{ fontSize: 13, color: "#595959", marginBottom: 16 }}>
                  {selected.description}
                </Paragraph>
              </>
            )}

            {/* Revision warning */}
            {selected.revisionCount > 0 && (
              <Alert
                type="warning" showIcon
                message={`Revised ${selected.revisionCount} time${selected.revisionCount > 1 ? "s" : ""}. Review all rounds below.`}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Full submission history */}
            <Divider orientationMargin={0} style={{ fontSize: 13 }}>Submission History</Divider>
            <div style={{ marginBottom: 16 }}>
              <SubmissionTimeline submissions={selected.submissions} />
            </div>

            {/* Review comment */}
            <Divider orientationMargin={0} style={{ fontSize: 13 }}>Your Review Comment</Divider>
            <TextArea
              rows={4}
              placeholder="Add a review comment (required for Revision Required or Reject)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              showCount
              maxLength={2000}
              style={{ marginBottom: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Required when sending back for revision or rejecting.
            </Text>
          </div>
        )}
      </Drawer>
    </div>
  );
}
