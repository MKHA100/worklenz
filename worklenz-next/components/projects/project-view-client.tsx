"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Tabs, Table, Tag, Button, Modal, Form, Input, Select, Space,
  Typography, Flex, Drawer, Descriptions, Divider, Progress,
  Avatar, Tooltip, Badge, App, Card, Empty, Statistic, Upload
} from "antd";
import {
  PlusOutlined, UnorderedListOutlined, AppstoreOutlined,
  TeamOutlined, UserOutlined, ClockCircleOutlined,
  CheckOutlined, RollbackOutlined, StopOutlined, PauseOutlined,
  PlayCircleOutlined, PauseCircleOutlined, UploadOutlined,
  PaperClipOutlined, DeleteOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile, UploadProps } from "antd/es/upload";
import { SubmissionTimeline } from "@/components/review/submission-timeline";

const { Title, Text, Paragraph } = Typography;

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "blue", IN_PROGRESS: "processing", SUBMITTED: "purple",
  REVISION_REQUIRED: "orange", ON_HOLD: "default", APPROVED: "success",
  REJECTED: "error", QUERY_RAISED: "gold", EXTENSION_REQUESTED: "cyan"
};
const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned", IN_PROGRESS: "In Progress", SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision Required", ON_HOLD: "On Hold",
  APPROVED: "Approved", Rejected: "Rejected", REJECTED: "Rejected",
  QUERY_RAISED: "Query Raised", EXTENSION_REQUESTED: "Extension Requested"
};

const ALL_STATUSES = ["ASSIGNED", "IN_PROGRESS", "QUERY_RAISED", "EXTENSION_REQUESTED",
  "SUBMITTED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "ON_HOLD"];
const KANBAN_COLS = ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVISION_REQUIRED", "ON_HOLD", "APPROVED", "REJECTED"];
const REVIEWER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];
const QS_SUBMITTABLE = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED"];

type Attachment = { id: string; fileKey: string; fileName: string; mimeType: string | null; fileSize: number | null; createdAt: string };
type Assignee = { id: string; fullName: string | null; email: string } | null;

type Submission = {
  id: string; roundNumber: number; submittedAt: string; submissionNote: string | null;
  outcome: string; reviewedAt: string | null; reviewComment: string | null;
  submittedBy: { id: string; fullName: string | null; email: string } | null;
  reviewedBy: { id: string; fullName: string | null; email: string } | null;
  attachments: Attachment[];
};

type TaskMemberUser = { id: string; fullName: string | null; email: string };

type Task = {
  id: string; title: string; description: string | null; status: string;
  projectId: string; assigneeId: string | null; reviewerId: string | null;
  submissionNote: string | null; reviewComment: string | null;
  reviewOutcome: string | null; submittedAt: string | null; reviewedAt: string | null;
  revisionCount: number; timeSpentMinute: number; plannedRate: number | null;
  actualRate: number | null; efficiency: number | null; variance: number | null;
  unit: string | null; tradeCode: string | null;
  createdAt: string; updatedAt: string; assignee: Assignee;
  taskMemberIds: string[];
  taskMemberUsers: TaskMemberUser[];
  attachments: Attachment[];
  submissions: Submission[];
};

type Member = { id: string; fullName: string | null; email: string; role: string };

type Props = {
  currentUserId: string;
  userRole: string;
  project: { id: string; name: string; code: string; officeName: string | null };
  initialTasks: Task[];
  members: Member[];
  seniors: Member[];
  allUsers: Member[];
};

const MANAGER_ROLES = ["owner", "admin", "managing_director", "senior_qs"];

export function ProjectViewClient({ currentUserId, userRole, project, initialTasks, members: initialMembers, seniors, allUsers }: Props) {
  const { message } = App.useApp();
  const isReviewer = REVIEWER_ROLES.includes(userRole);
  const canManageMembers = MANAGER_ROLES.includes(userRole);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [addMemberId, setAddMemberId] = useState<string | undefined>(undefined);
  const [addingMember, setAddingMember] = useState(false);
  const [editTradeCode, setEditTradeCode] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // File upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // ---------------------------------------------------------------------------
  // Timer — key insight: timerSessionSec tracks ONLY new seconds this session.
  // Display = task.timeSpentMinute * 60 + timerSessionSec
  // timerTaskId tracks which task is being timed, independently of which drawer is open.
  // Opening the same task again does NOT reset the timer.
  // ---------------------------------------------------------------------------
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerSessionSec, setTimerSessionSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable ref to always have fresh timerSessionSec in stopTimer closure
  const timerSessionSecRef = useRef(0);
  useEffect(() => { timerSessionSecRef.current = timerSessionSec; }, [timerSessionSec]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer(task: Task) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerTaskId(task.id);
    setTimerSessionSec(0);
    timerSessionSecRef.current = 0;
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSessionSec((s) => s + 1);
    }, 1000);
  }

  const stopTimer = useCallback(async (task: Task) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerTaskId(null);

    const elapsed = Math.round(timerSessionSecRef.current / 60);
    if (elapsed < 1) { message.warning("Minimum 1 minute to log"); setTimerSessionSec(0); return; }

    try {
      const newMinutes = task.timeSpentMinute + elapsed;
      await patchTask(task.id, { timeSpentMinute: newMinutes });
      message.success(`Logged ${elapsed} minute${elapsed !== 1 ? "s" : ""}`);
      setTimerSessionSec(0);
    } catch { message.error("Failed to log time"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatTimer(task: Task | null) {
    const base = (task?.timeSpentMinute ?? 0) * 60;
    const total = base + (timerTaskId === task?.id ? timerSessionSec : 0);
    const h = Math.floor(total / 3600).toString().padStart(2, "0");
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function openTask(task: Task) {
    // If timer is running for a DIFFERENT task: stop it (don't save — user chose to switch)
    if (timerRunning && timerTaskId !== task.id) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
      setTimerTaskId(null);
      setTimerSessionSec(0);
      message.warning("Timer stopped — switch task without saving");
    }
    // DON'T reset timer state if same task — timer keeps running across close/reopen
    setSelectedTask(task);
    setReviewComment("");
    setSubmissionNote("");
    setSelectedReviewerId(task.reviewerId ?? undefined);
    setEditTradeCode(task.tradeCode ?? "");
    setEditUnit(task.unit ?? "");
    setFileList([]);
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
    setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, ...task } : prev));
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
      setReviewComment("");
      setDrawerOpen(false);
    } catch { message.error("Action failed"); }
  }

  // Upload a single file to R2 via the sign endpoint
  // Server-side upload: Next.js → R2 (avoids browser CORS on direct presigned PUT)
  async function uploadFileToR2(file: File, taskId: string): Promise<{ fileKey: string; fileName: string; mimeType: string; fileSize: number }> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("taskId", taskId);

    const res = await fetch("/api/files/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Upload failed");
    }
    return res.json() as Promise<{ fileKey: string; fileName: string; mimeType: string; fileSize: number }>;
  }

  async function handleSubmitForReview() {
    if (!selectedTask) return;
    setSubmitting(true);
    setUploadingFiles(true);

    try {
      // 1. Upload all pending files to R2 and create attachment records
      const pendingFiles = fileList.filter((f) => f.originFileObj);
      for (const uf of pendingFiles) {
        const file = uf.originFileObj as File;
        const uploaded = await uploadFileToR2(file, selectedTask.id);
        const attRes = await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uploaded)
        });
        if (!attRes.ok) throw new Error("Failed to save attachment record");
        const { attachment } = await attRes.json() as { attachment: Attachment };
        // Optimistically add attachment to task
        setSelectedTask((prev) => prev ? { ...prev, attachments: [...prev.attachments, attachment] } : prev);
        setTasks((prev) => prev.map((t) => t.id === selectedTask.id
          ? { ...t, attachments: [...t.attachments, attachment] } : t));
      }

      // 2. Submit the task
      const submitRes = await fetch(`/api/jcc/tasks/${selectedTask.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionNote, reviewerId: selectedReviewerId ?? null })
      });
      if (!submitRes.ok) {
        const err = await submitRes.json() as { error: string };
        throw new Error(err.error ?? "Submit failed");
      }
      const { task } = await submitRes.json() as { task: Task };
      setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? { ...t, ...task } : t));
      setSelectedTask((prev) => prev ? { ...prev, ...task } : prev);
      message.success("Submitted for review");
      setFileList([]);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  }

  async function handleAddMember() {
    if (!addMemberId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberId })
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      const { member } = await res.json() as { member: Member };
      setMembers((prev) => prev.some((m) => m.id === member.id) ? prev : [...prev, member]);
      setAddMemberId(undefined);
    } catch (e) { message.error(e instanceof Error ? e.message : "Failed to add member"); }
    finally { setAddingMember(false); }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}/members?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (e) { message.error(e instanceof Error ? e.message : "Failed to remove member"); }
  }

  async function handleCreate(values: { title: string; assigneeIds?: string[]; status?: string; tradeCode?: string[]; unit?: string }) {
    setCreating(true);
    try {
      const assigneeIds = values.assigneeIds ?? [];
      // tradeCode comes as string[] from tags select — take first entry
      const tradeCode = Array.isArray(values.tradeCode) ? (values.tradeCode[0] ?? null) : (values.tradeCode ?? null);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: values.title,
          status: values.status ?? "ASSIGNED",
          assigneeIds,
          tradeCode,
          unit: values.unit ?? null
        })
      });
      if (!res.ok) throw new Error("Create failed");
      const { task } = await res.json() as { task: Task };
      const primaryAssignee = members.find((m) => m.id === task.assigneeId) ?? null;
      const taskMemberUsers = assigneeIds.map((uid) => {
        const m = members.find((x) => x.id === uid);
        return m ? { id: m.id, fullName: m.fullName, email: m.email } : null;
      }).filter(Boolean) as TaskMemberUser[];
      setTasks((prev) => [{
        ...task,
        assignee: primaryAssignee ? { id: primaryAssignee.id, fullName: primaryAssignee.fullName, email: primaryAssignee.email } : null,
        taskMemberIds: assigneeIds,
        taskMemberUsers,
        attachments: [], submissions: [], submittedAt: null, reviewedAt: null, reviewComment: null,
        reviewOutcome: null, submissionNote: null, reviewerId: null,
        revisionCount: 0, timeSpentMinute: 0, plannedRate: null, actualRate: null,
        efficiency: null, variance: null, unit: task.unit ?? null, tradeCode: task.tradeCode ?? null
      }, ...prev]);
      message.success("Task created");
      form.resetFields();
      setCreateModalOpen(false);
    } catch { message.error("Failed to create task"); }
    finally { setCreating(false); }
  }

  async function handleDeleteAttachment(taskId: string, attachmentId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?id=${attachmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSelectedTask((prev) => prev ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) } : prev);
      setTasks((prev) => prev.map((t) => t.id === taskId
        ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) } : t));
    } catch { message.error("Failed to delete attachment"); }
  }

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: () => false, // manual upload on submit
    onChange: ({ fileList: fl }) => setFileList(fl),
    multiple: true,
    maxCount: 10,
    showUploadList: false
  };

  // Task list columns
  const taskColumns: ColumnsType<Task> = [
    {
      title: "Title", dataIndex: "title", key: "title",
      render: (title, record) => (
        <Flex gap={6} align="center">
          <button onClick={() => openTask(record)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 14, color: "#262626", textAlign: "left", padding: 0 }}>
            {title}
          </button>
          {record.attachments.length > 0 && (
            <Tooltip title={`${record.attachments.length} attachment${record.attachments.length > 1 ? "s" : ""}`}>
              <PaperClipOutlined style={{ color: "#8c8c8c", fontSize: 13 }} />
            </Tooltip>
          )}
          {timerRunning && timerTaskId === record.id && (
            <Tooltip title="Timer running">
              <ClockCircleOutlined style={{ color: "#1677ff", fontSize: 12 }} />
            </Tooltip>
          )}
        </Flex>
      )
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 170,
      filters: ALL_STATUSES.map((s) => ({ text: STATUS_LABELS[s], value: s })),
      onFilter: (v, r) => r.status === v,
      render: (status: string) => <Tag color={STATUS_COLORS[status] ?? "default"}>{STATUS_LABELS[status] ?? status}</Tag>
    },
    {
      title: "Assignees", key: "assignee", width: 200,
      render: (_, record) => {
        const users = record.taskMemberUsers.length > 0
          ? record.taskMemberUsers
          : record.assignee ? [record.assignee] : [];
        if (users.length === 0) return <Text type="secondary" style={{ fontStyle: "italic" }}>Unassigned</Text>;
        return (
          <Flex gap={4} align="center" wrap="wrap">
            {users.map((u) => (
              <Tooltip key={u.id} title={u.fullName ?? u.email}>
                <Avatar size={24} icon={<UserOutlined />} style={{ background: "#1677ff", fontSize: 11, cursor: "default" }} />
              </Tooltip>
            ))}
            {users.length === 1 && (
              <Text style={{ fontSize: 13 }}>{users[0].fullName ?? users[0].email}</Text>
            )}
          </Flex>
        );
      }
    },
    {
      title: "Time", dataIndex: "timeSpentMinute", key: "time", width: 100,
      render: (min: number) => {
        const h = Math.floor(min / 60), m = min % 60;
        return <Text type="secondary" style={{ fontSize: 12 }}>{h}h {m}m</Text>;
      }
    },
    {
      title: "Revisions", dataIndex: "revisionCount", key: "revisions", width: 90,
      render: (n: number) => n > 0 ? <Badge count={n} color="orange" /> : <Text type="secondary">—</Text>
    },
    {
      title: "", key: "actions", width: 120,
      render: (_, record) => (
        <Select
          size="small" value={record.status}
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

  const isTimerActiveForSelected = timerRunning && timerTaskId === selectedTask?.id;
  const timerDisabled = selectedTask ? ["APPROVED", "REJECTED", "SUBMITTED"].includes(selectedTask.status) : false;

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

      <Tabs defaultActiveKey="list" items={[
        {
          key: "list", label: <span><UnorderedListOutlined /> Task List</span>,
          children: (
            <Table
              dataSource={tasks} columns={taskColumns} rowKey="id"
              pagination={{ pageSize: 20, showTotal: (t) => `${t} tasks` }}
              onRow={(r) => ({ onClick: () => openTask(r) })}
              size="middle" style={{ cursor: "pointer" }}
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
                        {colTasks.length === 0 && <Empty description="" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: "8px 0" }} />}
                        {colTasks.map((t) => (
                          <Card key={t.id} size="small" hoverable onClick={() => openTask(t)} style={{ borderRadius: 6, cursor: "pointer" }}>
                            <Text style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</Text>
                            {t.assignee && (
                              <Flex gap={4} align="center" style={{ marginTop: 6 }}>
                                <Avatar size={16} icon={<UserOutlined />} style={{ fontSize: 10, background: "#1677ff" }} />
                                <Text type="secondary" style={{ fontSize: 11 }}>{t.assignee.fullName ?? t.assignee.email}</Text>
                              </Flex>
                            )}
                            <Flex gap={4} wrap style={{ marginTop: 4 }}>
                              {t.revisionCount > 0 && <Tag color="orange" style={{ fontSize: 10 }}>{t.revisionCount} rev</Tag>}
                              {t.attachments.length > 0 && <Tag icon={<PaperClipOutlined />} style={{ fontSize: 10 }}>{t.attachments.length}</Tag>}
                              {timerRunning && timerTaskId === t.id && <Tag color="blue" style={{ fontSize: 10 }}>⏱</Tag>}
                            </Flex>
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
            <div>
              {canManageMembers && (
                <Flex gap={8} style={{ marginBottom: 16 }}>
                  <Select
                    style={{ flex: 1 }}
                    placeholder="Add a member..."
                    showSearch
                    allowClear
                    value={addMemberId}
                    onChange={setAddMemberId}
                    options={allUsers
                      .filter((u) => !members.some((m) => m.id === u.id))
                      .map((u) => ({ value: u.id, label: `${u.fullName ?? u.email} (${u.role.replace(/_/g, " ")})` }))}
                  />
                  <Button
                    type="primary" icon={<PlusOutlined />}
                    loading={addingMember}
                    disabled={!addMemberId}
                    onClick={handleAddMember}
                  >
                    Add
                  </Button>
                </Flex>
              )}
              <Table
                dataSource={members} rowKey="id" size="middle" pagination={false}
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
                    render: (role: string) => <Tag style={{ textTransform: "capitalize" }}>{role.replace(/_/g, " ")}</Tag>
                  },
                  {
                    title: "Tasks", key: "tasks", width: 100,
                    render: (_, m) => {
                      const count = tasks.filter((t) => t.assigneeId === m.id).length;
                      return <Tag color={count > 0 ? "blue" : "default"}>{count} tasks</Tag>;
                    }
                  },
                  ...(canManageMembers ? [{
                    title: "", key: "remove", width: 60,
                    render: (_: unknown, m: Member) => (
                      m.role === "managing_director" ? null : (
                        <Tooltip title="Remove from project">
                          <Button
                            size="small" danger type="text" icon={<DeleteOutlined />}
                            onClick={() => handleRemoveMember(m.id)}
                          />
                        </Tooltip>
                      )
                    )
                  }] : [])
                ]}
              />
            </div>
          )
        }
      ]} />

      {/* ------------------------------------------------------------------ */}
      {/* Task Drawer                                                          */}
      {/* ------------------------------------------------------------------ */}
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
        styles={{ wrapper: { width: 540 } }}
        extra={
          selectedTask && (
            <Select
              value={selectedTask.status}
              onChange={(v) => handleStatusChange(selectedTask.id, v)}
              style={{ width: 170 }}
              options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
          )
        }
      >
        {selectedTask && (
          <div>
            {/* Description */}
            {selectedTask.description && (
              <>
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</Text>
                <Paragraph style={{ marginTop: 4 }}>{selectedTask.description}</Paragraph>
                <Divider />
              </>
            )}

            {/* Meta */}
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Assignee">
                {selectedTask.assignee ? (selectedTask.assignee.fullName ?? selectedTask.assignee.email) : "Unassigned"}
              </Descriptions.Item>
              <Descriptions.Item label="Trade Code">
                <Input
                  variant="borderless"
                  size="small"
                  value={editTradeCode}
                  placeholder="—"
                  onChange={(e) => setEditTradeCode(e.target.value)}
                  onBlur={() => {
                    if (editTradeCode !== (selectedTask.tradeCode ?? "")) {
                      patchTask(selectedTask.id, { tradeCode: editTradeCode || null }).catch(() => {});
                    }
                  }}
                  style={{ padding: 0, width: "100%" }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Norm">
                <Input
                  variant="borderless"
                  size="small"
                  value={editUnit}
                  placeholder="—"
                  onChange={(e) => setEditUnit(e.target.value)}
                  onBlur={() => {
                    if (editUnit !== (selectedTask.unit ?? "")) {
                      patchTask(selectedTask.id, { unit: editUnit || null }).catch(() => {});
                    }
                  }}
                  style={{ padding: 0, width: "100%" }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Time Logged">
                {Math.floor(selectedTask.timeSpentMinute / 60)}h {selectedTask.timeSpentMinute % 60}m
              </Descriptions.Item>
              <Descriptions.Item label="Revisions">{selectedTask.revisionCount}</Descriptions.Item>
            </Descriptions>

            {/* ---- Time Tracker (always visible) ---- */}
            <Divider />
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Time Tracker</Text>
            <Card size="small" style={{ marginTop: 8, background: isTimerActiveForSelected ? "#f0f9ff" : "#fafafa", borderRadius: 8 }}>
              <Flex justify="space-between" align="center">
                <Statistic
                  value={formatTimer(selectedTask)}
                  prefix={<ClockCircleOutlined style={{ color: isTimerActiveForSelected ? "#1677ff" : "#8c8c8c" }} />}
                  styles={{ content: { fontSize: 22, fontFamily: "monospace", color: isTimerActiveForSelected ? "#1677ff" : "#595959" } }}
                />
                <Space>
                  {!isTimerActiveForSelected ? (
                    <Button
                      type="primary" icon={<PlayCircleOutlined />}
                      onClick={() => startTimer(selectedTask)}
                      disabled={timerDisabled}
                    >Start</Button>
                  ) : (
                    <Button danger icon={<PauseCircleOutlined />} onClick={() => stopTimer(selectedTask)}>
                      Stop & Log
                    </Button>
                  )}
                </Space>
              </Flex>
            </Card>

            {/* ---- Submission history — visible to ALL roles ---- */}
            {selectedTask.submissions.length > 0 && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Submission History
                </Text>
                <div style={{ marginTop: 12 }}>
                  <SubmissionTimeline submissions={selectedTask.submissions} />
                </div>
              </>
            )}

            {/* ================================================================
                QS PANEL — submit form (only when not submitted/approved/rejected)
                Only for non-reviewer roles, and only for submittable statuses.
                ================================================================ */}
            {!isReviewer && QS_SUBMITTABLE.includes(selectedTask.status) && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Submit for Review
                </Text>

                {/* Reviewer selector */}
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Assign Reviewer (optional — if blank, all seniors can review)</Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    placeholder="Any available senior reviewer"
                    allowClear
                    value={selectedReviewerId}
                    onChange={setSelectedReviewerId}
                    options={seniors.map((s) => ({
                      value: s.id,
                      label: `${s.fullName ?? s.email} (${s.role.replace(/_/g, " ")})`
                    }))}
                  />
                </div>

                {/* Submission note */}
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Submission Notes</Text>
                  <Input.TextArea
                    style={{ marginTop: 4 }}
                    rows={3}
                    placeholder="Describe what was completed, any assumptions, drawing refs..."
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                  />
                </div>

                {/* File upload */}
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Attach Documents</Text>
                  <Upload {...uploadProps} style={{ marginTop: 4 }}>
                    <Button icon={<UploadOutlined />} style={{ marginTop: 4, width: "100%" }}>
                      Select Files
                    </Button>
                  </Upload>
                  {fileList.length > 0 && (
                    <Flex vertical gap={4} style={{ marginTop: 8 }}>
                      {fileList.map((f) => (
                        <Flex key={f.uid} justify="space-between" align="center"
                          style={{ background: "#f5f5f5", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
                          <Flex gap={6} align="center">
                            <PaperClipOutlined />
                            <Text style={{ fontSize: 12 }}>{f.name}</Text>
                          </Flex>
                          <Button
                            type="text" size="small" danger icon={<DeleteOutlined />}
                            onClick={() => setFileList((prev) => prev.filter((x) => x.uid !== f.uid))}
                          />
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </div>

                {/* Submit button */}
                <Button
                  type="primary" block
                  style={{ marginTop: 16 }}
                  loading={submitting || uploadingFiles}
                  onClick={handleSubmitForReview}
                >
                  {fileList.length > 0 ? `Upload ${fileList.length} file${fileList.length > 1 ? "s" : ""} & Submit` : "Submit for Review"}
                </Button>
              </>
            )}

            {/* ================================================================
                REVIEWER PANEL — review actions (only for senior_qs and above)
                Only shown when task is SUBMITTED.
                ================================================================ */}
            {isReviewer && selectedTask.status === "SUBMITTED" && (
              <>
                <Divider />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Review Actions</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Review Comment</Text>
                  <Input.TextArea
                    style={{ marginTop: 4 }}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add review comment..."
                    rows={3}
                  />
                </div>
                <Space wrap style={{ marginTop: 12 }}>
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
                  <Button icon={<PauseOutlined />} onClick={() => handleReviewAction("on_hold")}>On Hold</Button>
                  <Button danger icon={<StopOutlined />} onClick={() => handleReviewAction("reject")}>Reject</Button>
                </Space>
              </>
            )}

            {/* Extra metadata */}
            <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
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
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal title="Add Task" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); form.resetFields(); }} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Describe the task..." />
          </Form.Item>
          <Form.Item name="assigneeIds" label="Assign To (multiple allowed)">
            <Select
              mode="multiple"
              placeholder="Select one or more members"
              allowClear
              showSearch
              filterOption={(input, opt) =>
                (opt?.label?.toString() ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={members.map((m) => ({ value: m.id, label: m.fullName ?? m.email }))}
            />
          </Form.Item>
          <Form.Item name="tradeCode" label="Trade Code">
            <Select
              mode="tags"
              maxCount={1}
              placeholder="Select or type your own trade code"
              allowClear
              tokenSeparators={[","]}
              options={[
                { value: "QS", label: "QS — Quantity Surveying" },
                { value: "STRUCT", label: "STRUCT — Structural" },
                { value: "MEP", label: "MEP — Mechanical Electrical Plumbing" },
                { value: "ARCH", label: "ARCH — Architectural" },
                { value: "CIVIL", label: "CIVIL — Civil" },
                { value: "LAND", label: "LAND — Landscaping" },
                { value: "INT", label: "INT — Interior" },
                { value: "FIRE", label: "FIRE — Fire Protection" }
              ]}
            />
          </Form.Item>
          <Form.Item name="unit" label="Norm">
            <Input placeholder="e.g. m², m³, lm..." />
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
