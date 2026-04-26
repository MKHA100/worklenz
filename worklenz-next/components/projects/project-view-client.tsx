"use client";

import { useState, useEffect, useRef } from "react";
import {
  Tabs, Table, Tag, Button, Modal, Form, Input, Select, Space,
  Typography, Flex, Drawer, Descriptions, Divider, Progress,
  Avatar, Tooltip, Badge, App, Card, Empty, Statistic
} from "antd";
import {
  PlusOutlined, UnorderedListOutlined, AppstoreOutlined,
  TeamOutlined, UserOutlined, ClockCircleOutlined,
  CheckOutlined, RollbackOutlined, StopOutlined, PauseOutlined,
  PlayCircleOutlined, PauseCircleOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text, Paragraph } = Typography;

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

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const KANBAN_COLS = ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVISION_REQUIRED", "ON_HOLD", "APPROVED", "REJECTED"];

type Assignee = { id: string; fullName: string | null; email: string } | null;

type Task = {
  id: string; title: string; description: string | null; status: string;
  projectId: string; assigneeId: string | null; reviewComment: string | null;
  reviewOutcome: string | null; submittedAt: string | null; reviewedAt: string | null;
  revisionCount: number; timeSpentMinute: number; plannedRate: number | null;
  actualRate: number | null; efficiency: number | null; variance: number | null;
  unit: string | null; tradeCode: string | null;
  createdAt: string; updatedAt: string; assignee: Assignee;
};

type Member = { id: string; fullName: string | null; email: string; role: string };

type Props = {
  project: { id: string; name: string; code: string; officeName: string | null };
  initialTasks: Task[];
  members: Member[];
};

export function ProjectViewClient({ project, initialTasks, members }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const { message } = App.useApp();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [form] = Form.useForm();

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<Date | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer() {
    if (!selectedTask) return;
    // Resume from saved accumulated time
    const baseSeconds = selectedTask.timeSpentMinute * 60;
    timerStartRef.current = new Date();
    setTimerSeconds(baseSeconds);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
  }

  async function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    if (!selectedTask || !timerStartRef.current) return;
    // Elapsed = current display seconds minus the base seconds we started from
    const baseSeconds = selectedTask.timeSpentMinute * 60;
    const elapsedSeconds = timerSeconds - baseSeconds;
    const elapsed = Math.round(elapsedSeconds / 60);
    if (elapsed < 1) { message.warning("Minimum 1 minute to log"); return; }
    try {
      const newMinutes = selectedTask.timeSpentMinute + elapsed;
      await patchTask(selectedTask.id, { timeSpentMinute: newMinutes });
      message.success(`Logged ${elapsed} minute${elapsed > 1 ? "s" : ""}`);
    } catch { message.error("Failed to log time"); }
  }

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  function openTask(task: Task) {
    // Stop any running timer before switching tasks
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    timerStartRef.current = null;
    // Initialize display to task's accumulated time
    setTimerSeconds(task.timeSpentMinute * 60);
    setSelectedTask(task);
    setReviewComment(task.reviewComment ?? "");
    setDrawerOpen(true);
  }

  async function patchTask(taskId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Update failed");
    const { task } = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...task } : t)));
    if (selectedTask?.id === taskId) setSelectedTask((prev) => prev ? { ...prev, ...task } : null);
    return task;
  }

  async function handleStatusChange(taskId: string, status: string) {
    try {
      await patchTask(taskId, { status });
      message.success(`Status → ${STATUS_LABELS[status] ?? status}`);
    } catch { message.error("Update failed"); }
  }

  async function handleReviewAction(action: "approve" | "revision" | "reject" | "on_hold") {
    if (!selectedTask) return;
    const statusMap = { approve: "APPROVED", revision: "REVISION_REQUIRED", reject: "REJECTED", on_hold: "ON_HOLD" };
    try {
      await patchTask(selectedTask.id, { status: statusMap[action], reviewComment });
      message.success("Review action applied");
      setDrawerOpen(false);
    } catch { message.error("Action failed"); }
  }

  async function handleCreate(values: { title: string; assigneeId?: string; status?: string; tradeCode?: string }) {
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, projectId: project.id, status: values.status ?? "ASSIGNED" })
      });
      if (!res.ok) throw new Error("Create failed");
      const { task } = await res.json();
      const assignee = members.find((m) => m.id === task.assigneeId) ?? null;
      setTasks((prev) => [{
        ...task, assignee: assignee ? { id: assignee.id, fullName: assignee.fullName, email: assignee.email } : null,
        submittedAt: null, reviewedAt: null, reviewComment: null, reviewOutcome: null,
        revisionCount: 0, timeSpentMinute: 0, plannedRate: null, actualRate: null,
        efficiency: null, variance: null, unit: null, tradeCode: null
      }, ...prev]);
      message.success("Task created");
      form.resetFields();
      setCreateModalOpen(false);
    } catch { message.error("Failed to create task"); }
    finally { setCreating(false); }
  }

  // Task list columns
  const taskColumns: ColumnsType<Task> = [
    {
      title: "Title", dataIndex: "title", key: "title",
      render: (title, record) => (
        <button onClick={() => openTask(record)}
          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 14, color: "#262626", textAlign: "left", padding: 0 }}>
          {title}
        </button>
      )
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 170,
      filters: ALL_STATUSES.map((s) => ({ text: STATUS_LABELS[s], value: s })),
      onFilter: (v, r) => r.status === v,
      render: (status: string) => <Tag color={STATUS_COLORS[status] ?? "default"}>{STATUS_LABELS[status] ?? status}</Tag>
    },
    {
      title: "Assignee", key: "assignee", width: 160,
      render: (_, record) => record.assignee ? (
        <Flex gap={6} align="center">
          <Avatar size={24} icon={<UserOutlined />} style={{ background: "#1677ff", fontSize: 12 }} />
          <Text style={{ fontSize: 13 }}>{record.assignee.fullName ?? record.assignee.email}</Text>
        </Flex>
      ) : <Text type="secondary" style={{ fontStyle: "italic" }}>Unassigned</Text>
    },
    {
      title: "Time", dataIndex: "timeSpentMinute", key: "time", width: 100,
      render: (min: number) => {
        const h = Math.floor(min / 60), m = min % 60;
        return <Text type="secondary" style={{ fontSize: 12 }}>{h}h {m}m</Text>;
      }
    },
    {
      title: "Revisions", dataIndex: "revisionCount", key: "revisions", width: 100,
      render: (n: number) => n > 0 ? <Badge count={n} color="orange" /> : <Text type="secondary">—</Text>
    },
    {
      title: "", key: "actions", width: 120,
      render: (_, record) => (
        <Select
          size="small"
          value={record.status}
          onChange={(v) => handleStatusChange(record.id, v)}
          style={{ width: 100 }}
          options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          onClick={(e) => e.stopPropagation()}
        />
      )
    }
  ];

  const approved = tasks.filter((t) => t.status === "APPROVED").length;
  const completion = tasks.length > 0 ? Math.round((approved / tasks.length) * 100) : 0;

  return (
    <div>
      {/* Project header */}
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 20 }}>
        <div>
          <Flex gap={8} align="center">
            <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
            <Tag>{project.code}</Tag>
            {project.officeName && <Tag color="geekblue">{project.officeName}</Tag>}
          </Flex>
          <Flex gap={16} align="center" style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{tasks.length} tasks</Text>
            <Progress percent={completion} size="small" style={{ width: 120, margin: 0 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>{completion}% complete</Text>
          </Flex>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          Add Task
        </Button>
      </Flex>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: "list", label: <span><UnorderedListOutlined /> Task List</span>,
            children: (
              <Table
                dataSource={tasks} columns={taskColumns} rowKey="id"
                pagination={{ pageSize: 20, showTotal: (t) => `${t} tasks` }}
                onRow={(r) => ({ onClick: () => openTask(r) })}
                size="middle"
                style={{ cursor: "pointer" }}
              />
            )
          },
          {
            key: "board", label: <span><AppstoreOutlined /> Board</span>,
            children: (
              <div style={{ overflowX: "auto" }}>
                <Flex gap={12} style={{ minWidth: 900, padding: "8px 0" }}>
                  {KANBAN_COLS.map((col) => {
                    const colTasks = tasks.filter((t) => t.status === col);
                    return (
                      <div key={col} style={{ flex: "0 0 220px", background: "#f5f5f5", borderRadius: 8, padding: 12 }}>
                        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {STATUS_LABELS[col]}
                          </Text>
                          <Badge count={colTasks.length} color={STATUS_COLORS[col] === "default" ? "#8c8c8c" : undefined} />
                        </Flex>
                        <Flex vertical gap={8}>
                          {colTasks.length === 0 && (
                            <Empty description="" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: "8px 0" }} />
                          )}
                          {colTasks.map((t) => (
                            <Card
                              key={t.id} size="small" hoverable
                              onClick={() => openTask(t)}
                              style={{ borderRadius: 6, cursor: "pointer" }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</Text>
                              {t.assignee && (
                                <Flex gap={4} align="center" style={{ marginTop: 6 }}>
                                  <Avatar size={16} icon={<UserOutlined />} style={{ fontSize: 10, background: "#1677ff" }} />
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {t.assignee.fullName ?? t.assignee.email}
                                  </Text>
                                </Flex>
                              )}
                              {t.revisionCount > 0 && (
                                <Tag color="orange" style={{ fontSize: 10, marginTop: 4 }}>
                                  {t.revisionCount} revision{t.revisionCount > 1 ? "s" : ""}
                                </Tag>
                              )}
                            </Card>
                          ))}
                        </Flex>
                      </div>
                    );
                  })}
                </Flex>
              </div>
            )
          },
          {
            key: "members", label: <span><TeamOutlined /> Members</span>,
            children: (
              <Table
                dataSource={members} rowKey="id" size="middle"
                pagination={false}
                columns={[
                  {
                    title: "Member", key: "name",
                    render: (_, m) => (
                      <Flex gap={10} align="center">
                        <Avatar icon={<UserOutlined />} style={{ background: "#1677ff" }} />
                        <div>
                          <Text strong style={{ fontSize: 14 }}>{m.fullName ?? "—"}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>{m.email}</Text>
                        </div>
                      </Flex>
                    )
                  },
                  {
                    title: "Role", dataIndex: "role", key: "role", width: 160,
                    render: (role: string) => <Tag style={{ textTransform: "capitalize" }}>{role.replace("_", " ")}</Tag>
                  },
                  {
                    title: "Tasks", key: "tasks", width: 120,
                    render: (_, m) => {
                      const count = tasks.filter((t) => t.assigneeId === m.id).length;
                      return <Tag color={count > 0 ? "blue" : "default"}>{count} tasks</Tag>;
                    }
                  }
                ]}
              />
            )
          }
        ]}
      />

      {/* Task Drawer */}
      <Drawer
        title={
          <Flex gap={8} align="center">
            <Text strong>{selectedTask?.title}</Text>
            {selectedTask && <Tag color={STATUS_COLORS[selectedTask.status] ?? "default"}>{STATUS_LABELS[selectedTask.status] ?? selectedTask.status}</Tag>}
          </Flex>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="default"
        styles={{ wrapper: { width: 520 } }}
        extra={
          selectedTask && (
            <Select
              value={selectedTask.status}
              onChange={(v) => handleStatusChange(selectedTask.id, v)}
              style={{ width: 160 }}
              options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
          )
        }
      >
        {selectedTask && (
          <div>
            {selectedTask.description && (
              <>
                <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>Description</Text>
                <Paragraph style={{ marginTop: 4 }}>{selectedTask.description}</Paragraph>
                <Divider />
              </>
            )}

            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Assignee">
                {selectedTask.assignee
                  ? (selectedTask.assignee.fullName ?? selectedTask.assignee.email)
                  : "Unassigned"}
              </Descriptions.Item>
              <Descriptions.Item label="Trade Code">{selectedTask.tradeCode ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Unit">{selectedTask.unit ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Time Logged">
                {Math.floor(selectedTask.timeSpentMinute / 60)}h {selectedTask.timeSpentMinute % 60}m
              </Descriptions.Item>
              <Descriptions.Item label="Revisions">{selectedTask.revisionCount}</Descriptions.Item>
            </Descriptions>

            {/* Time tracker */}
            <Divider />
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>Time Tracker</Text>
            <Card
              size="small"
              style={{ marginTop: 8, background: timerRunning ? "#f0f9ff" : "#fafafa", borderRadius: 8 }}
            >
              <Flex justify="space-between" align="center">
                <Statistic
                  value={formatTimer(timerSeconds)}
                  prefix={<ClockCircleOutlined style={{ color: timerRunning ? "#1677ff" : "#8c8c8c" }} />}
                  styles={{ content: { fontSize: 22, fontFamily: "monospace", color: timerRunning ? "#1677ff" : "#595959" } }}
                />
                <Space>
                  {!timerRunning ? (
                    <Button
                      type="primary" icon={<PlayCircleOutlined />}
                      onClick={startTimer}
                      disabled={["APPROVED", "REJECTED", "SUBMITTED"].includes(selectedTask.status)}
                    >
                      Start
                    </Button>
                  ) : (
                    <Button
                      danger icon={<PauseCircleOutlined />}
                      onClick={stopTimer}
                    >
                      Stop & Log
                    </Button>
                  )}
                </Space>
              </Flex>
            </Card>

            <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
              {selectedTask.submittedAt && (
                <Descriptions.Item label="Submitted">
                  {new Date(selectedTask.submittedAt).toLocaleDateString()}
                </Descriptions.Item>
              )}
              {selectedTask.plannedRate != null && (
                <Descriptions.Item label="Planned Rate">{selectedTask.plannedRate}</Descriptions.Item>
              )}
              {selectedTask.efficiency != null && (
                <Descriptions.Item label="Efficiency">
                  <Text type={selectedTask.efficiency >= 1 ? "success" : "danger"}>
                    {(selectedTask.efficiency * 100).toFixed(1)}%
                  </Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedTask.reviewComment && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>Review Comment</Text>
                <Paragraph style={{ marginTop: 4, background: "#fff7e6", padding: 12, borderRadius: 6 }}>
                  {selectedTask.reviewComment}
                </Paragraph>
              </>
            )}

            {/* Review actions for submitted tasks */}
            {selectedTask.status === "SUBMITTED" && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>Review Actions</Text>
                <Form.Item label="Comment" style={{ marginTop: 8 }}>
                  <Input.TextArea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add review comment..."
                    rows={3}
                  />
                </Form.Item>
                <Space wrap>
                  <Button
                    type="primary" icon={<CheckOutlined />}
                    onClick={() => handleReviewAction("approve")}
                    style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  >Approve</Button>
                  <Button
                    icon={<RollbackOutlined />}
                    onClick={() => handleReviewAction("revision")}
                    style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
                  >Revision</Button>
                  <Button
                    icon={<PauseOutlined />}
                    onClick={() => handleReviewAction("on_hold")}
                  >On Hold</Button>
                  <Button
                    danger icon={<StopOutlined />}
                    onClick={() => handleReviewAction("reject")}
                  >Reject</Button>
                </Space>
              </>
            )}

            {/* Submit for review */}
            {["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED"].includes(selectedTask.status) && (
              <>
                <Divider />
                <Button
                  type="primary" block
                  onClick={() => handleStatusChange(selectedTask.id, "SUBMITTED")}
                >
                  Submit for Review
                </Button>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal title="Add Task" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); form.resetFields(); }} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Describe the task..." />
          </Form.Item>
          <Form.Item name="assigneeId" label="Assign To">
            <Select
              placeholder="Select member"
              allowClear
              options={members.map((m) => ({
                value: m.id,
                label: m.fullName ?? m.email
              }))}
            />
          </Form.Item>
          <Form.Item name="tradeCode" label="Trade Code">
            <Select
              placeholder="Select trade"
              allowClear
              options={[
                { value: "QS", label: "Quantity Surveying" },
                { value: "STRUCT", label: "Structural" },
                { value: "MEP", label: "MEP" },
                { value: "ARCH", label: "Architectural" },
                { value: "CIVIL", label: "Civil" }
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="Initial Status" initialValue="ASSIGNED">
            <Select options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
          </Form.Item>
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => { setCreateModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Create</Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}
