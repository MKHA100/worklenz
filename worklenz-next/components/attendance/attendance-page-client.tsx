"use client";

import { useState } from "react";
import {
  Card, Table, Tag, Button, Form, Select, DatePicker,
  Input, Typography, Flex, App, Row, Col, Tabs, Avatar,
  Progress, Statistic, Badge, Tooltip
} from "antd";
import {
  PlusOutlined, CalendarOutlined, TeamOutlined,
  UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, MinusCircleOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  present: "success", absent: "error", half_day: "warning", on_leave: "processing"
};
const STATUS_LABELS: Record<string, string> = {
  present: "Present", absent: "Absent", half_day: "Half Day", on_leave: "On Leave"
};
const STATUS_HEX: Record<string, string> = {
  present: "#52c41a", absent: "#ff4d4f", half_day: "#faad14", on_leave: "#1677ff"
};

type AttendanceRecord = {
  id: string; workDate: string; status: string;
  checkInTime: string; reason: string | null; officeName: string | null;
};
type Office = { id: string; name: string; code: string };
type TeamUser = { id: string; fullName: string | null; email: string; role: string };
type TeamData = {
  users: TeamUser[];
  monthlyStats: Record<string, Record<string, number>>;
  todayByUser: Record<string, string>;
  monthLabel: string;
};
type Props = {
  userRole: string;
  records: AttendanceRecord[];
  offices: Office[];
  teamData: TeamData | null;
};

const recordColumns: ColumnsType<AttendanceRecord> = [
  {
    title: "Date", dataIndex: "workDate", key: "workDate",
    sorter: (a, b) => a.workDate.localeCompare(b.workDate),
    defaultSortOrder: "descend"
  },
  {
    title: "Status", dataIndex: "status", key: "status",
    filters: Object.entries(STATUS_LABELS).map(([v, t]) => ({ text: t, value: v })),
    onFilter: (v, r) => r.status === v,
    render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{STATUS_LABELS[s] ?? s}</Tag>
  },
  { title: "Check-in", dataIndex: "checkInTime", key: "checkInTime", width: 100 },
  {
    title: "Office", key: "office",
    render: (_, r) => r.officeName ? <Text>{r.officeName}</Text> : <Text type="secondary">—</Text>
  },
  {
    title: "Reason", dataIndex: "reason", key: "reason",
    render: (r: string | null) => r ?? <Text type="secondary">—</Text>
  }
];

function AttendanceBar({ stats, total }: { stats: Record<string, number>; total: number }) {
  if (total === 0) return <Text type="secondary" style={{ fontSize: 12 }}>No records</Text>;
  const segments = ["present", "half_day", "on_leave", "absent"] as const;
  return (
    <Tooltip
      title={segments.map((s) => `${STATUS_LABELS[s]}: ${stats[s] ?? 0}`).join(" | ")}
    >
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", width: "100%", minWidth: 120 }}>
        {segments.map((s) => {
          const pct = ((stats[s] ?? 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <div key={s} style={{ width: `${pct}%`, background: STATUS_HEX[s], transition: "width 0.3s" }} />
          );
        })}
      </div>
    </Tooltip>
  );
}

function TodayStatusIcon({ status }: { status: string | undefined }) {
  if (!status) return <Badge status="default" text={<Text type="secondary" style={{ fontSize: 12 }}>Not logged</Text>} />;
  const iconMap: Record<string, React.ReactNode> = {
    present: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
    absent: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
    half_day: <MinusCircleOutlined style={{ color: "#faad14" }} />,
    on_leave: <ClockCircleOutlined style={{ color: "#1677ff" }} />
  };
  return (
    <Flex gap={4} align="center">
      {iconMap[status] ?? null}
      <Tag color={STATUS_COLORS[status] ?? "default"} style={{ margin: 0 }}>
        {STATUS_LABELS[status] ?? status}
      </Tag>
    </Flex>
  );
}

function TeamDashboard({ data }: { data: TeamData }) {
  const { users, monthlyStats, todayByUser, monthLabel } = data;

  // Today's summary counts
  const todayCounts = { present: 0, absent: 0, half_day: 0, on_leave: 0, not_logged: 0 };
  for (const u of users) {
    const s = todayByUser[u.id];
    if (!s) todayCounts.not_logged++;
    else if (s in todayCounts) (todayCounts as Record<string, number>)[s]++;
  }

  const teamColumns: ColumnsType<TeamUser> = [
    {
      title: "Member", key: "member", width: 220,
      render: (_, u) => (
        <Flex gap={8} align="center">
          <Avatar size={32} icon={<UserOutlined />} style={{ background: "#1677ff", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, display: "block" }}>{u.fullName ?? u.email}</Text>
            <Tag style={{ fontSize: 10, textTransform: "capitalize", marginTop: 2 }}>
              {u.role.replace(/_/g, " ")}
            </Tag>
          </div>
        </Flex>
      )
    },
    {
      title: "Today", key: "today", width: 150,
      sorter: (a, b) => (todayByUser[a.id] ?? "").localeCompare(todayByUser[b.id] ?? ""),
      render: (_, u) => <TodayStatusIcon status={todayByUser[u.id]} />
    },
    {
      title: "Present", key: "present", width: 80, align: "center",
      sorter: (a, b) => (monthlyStats[a.id]?.present ?? 0) - (monthlyStats[b.id]?.present ?? 0),
      render: (_, u) => (
        <Text style={{ color: "#52c41a", fontWeight: 600 }}>
          {monthlyStats[u.id]?.present ?? 0}
        </Text>
      )
    },
    {
      title: "Half Day", key: "half_day", width: 90, align: "center",
      render: (_, u) => (
        <Text style={{ color: "#faad14", fontWeight: 600 }}>
          {monthlyStats[u.id]?.half_day ?? 0}
        </Text>
      )
    },
    {
      title: "On Leave", key: "on_leave", width: 90, align: "center",
      render: (_, u) => (
        <Text style={{ color: "#1677ff", fontWeight: 600 }}>
          {monthlyStats[u.id]?.on_leave ?? 0}
        </Text>
      )
    },
    {
      title: "Absent", key: "absent", width: 80, align: "center",
      sorter: (a, b) => (monthlyStats[a.id]?.absent ?? 0) - (monthlyStats[b.id]?.absent ?? 0),
      render: (_, u) => (
        <Text style={{ color: "#ff4d4f", fontWeight: 600 }}>
          {monthlyStats[u.id]?.absent ?? 0}
        </Text>
      )
    },
    {
      title: `${monthLabel} Breakdown`, key: "bar", minWidth: 160,
      render: (_, u) => {
        const s = monthlyStats[u.id] ?? {};
        const total = Object.values(s).reduce((a, b) => a + b, 0);
        const attendRate = total > 0
          ? Math.round(((s.present ?? 0) + (s.half_day ?? 0) * 0.5) / total * 100)
          : 0;
        return (
          <Flex vertical gap={4}>
            <AttendanceBar stats={s} total={total} />
            <Text type="secondary" style={{ fontSize: 11 }}>{attendRate}% attendance rate</Text>
          </Flex>
        );
      }
    }
  ];

  return (
    <div>
      {/* Today summary cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {[
          { label: "Present", count: todayCounts.present, color: "#52c41a", icon: <CheckCircleOutlined /> },
          { label: "Half Day", count: todayCounts.half_day, color: "#faad14", icon: <MinusCircleOutlined /> },
          { label: "On Leave", count: todayCounts.on_leave, color: "#1677ff", icon: <ClockCircleOutlined /> },
          { label: "Absent", count: todayCounts.absent, color: "#ff4d4f", icon: <CloseCircleOutlined /> },
          { label: "Not Logged", count: todayCounts.not_logged, color: "#8c8c8c", icon: <UserOutlined /> }
        ].map(({ label, count, color, icon }) => (
          <Col xs={12} sm={8} md={5} key={label}>
            <Card variant="borderless" style={{ textAlign: "center", border: `1px solid ${color}22`, borderTop: `3px solid ${color}` }}>
              <Statistic
                title={label}
                value={count}
                prefix={<span style={{ color }}>{icon}</span>}
                styles={{ content: { color, fontSize: 28 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Stacked visual bar for today at a glance */}
      {users.length > 0 && (
        <Card variant="borderless" style={{ marginBottom: 24 }}>
          <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Today at a glance — {users.length} team members
          </Text>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
            {users.map((u) => {
              const s = todayByUser[u.id];
              const bg = s ? STATUS_HEX[s] : "#e8e8e8";
              return (
                <Tooltip
                  key={u.id}
                  title={`${u.fullName ?? u.email}: ${s ? STATUS_LABELS[s] : "Not logged"}`}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: bg, display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "default",
                    border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                  }}>
                    <Text style={{ color: "white", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                      {(u.fullName ?? u.email).slice(0, 2).toUpperCase()}
                    </Text>
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <Flex gap={16} wrap style={{ marginTop: 12 }}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <Flex key={k} gap={4} align="center">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_HEX[k] }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
              </Flex>
            ))}
            <Flex gap={4} align="center">
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "#e8e8e8", border: "1px solid #d9d9d9" }} />
              <Text type="secondary" style={{ fontSize: 12 }}>Not Logged</Text>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Per-person table */}
      <Card
        title={<span><TeamOutlined style={{ marginRight: 8 }} />Team Attendance — {monthLabel}</span>}
        variant="borderless"
      >
        <Table
          dataSource={users}
          columns={teamColumns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t) => `${t} members` }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}

export function AttendancePageClient({ userRole, records: initial, offices, teamData }: Props) {
  const { message } = App.useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const status = Form.useWatch("status", form);

  const isSenior = teamData !== null;

  async function handleSubmit(values: {
    workDate: dayjs.Dayjs; status: string; officeId?: string; reason?: string;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: values.workDate.format("YYYY-MM-DD"),
          status: values.status,
          officeId: values.officeId,
          reason: values.reason
        })
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        throw new Error(e.error ?? "Failed");
      }
      const { attendance } = await res.json() as { attendance: { id: string; workDate: string; status: string; checkInTime: string; reason: string | null; officeId: string | null } };
      setRecords((prev) => [
        {
          id: attendance.id,
          workDate: attendance.workDate.slice(0, 10),
          status: attendance.status,
          checkInTime: attendance.checkInTime.slice(11, 16),
          reason: attendance.reason,
          officeName: offices.find((o) => o.id === attendance.officeId)?.name ?? null
        },
        ...prev.filter((r) => r.workDate !== attendance.workDate.slice(0, 10))
      ]);
      message.success("Attendance logged");
      form.resetFields();
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const myLog = (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={8}>
        <Card title="Log Attendance" variant="borderless" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="workDate" label="Date" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                placeholder="Select status"
                options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            {offices.length > 0 && (
              <Form.Item name="officeId" label="Office">
                <Select
                  placeholder="Select office" allowClear
                  options={offices.map((o) => ({ value: o.id, label: `${o.name} (${o.code})` }))}
                />
              </Form.Item>
            )}
            {(status === "absent" || status === "half_day" || status === "on_leave") && (
              <Form.Item name="reason" label="Reason">
                <Input.TextArea rows={2} placeholder="Reason..." />
              </Form.Item>
            )}
            <Button type="primary" htmlType="submit" loading={submitting} icon={<PlusOutlined />} block>
              Log Attendance
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={16}>
        <Card
          title={`Recent Records (${records.length})`}
          variant="borderless"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <Table
            dataSource={records} columns={recordColumns} rowKey="id"
            pagination={{ pageSize: 10, size: "small" }}
            size="small"
            locale={{ emptyText: "No attendance records yet." }}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Attendance</Title>
          <Text type="secondary">
            {isSenior ? "Track your attendance and monitor your team" : "Track your daily attendance"}
          </Text>
        </div>
        <CalendarOutlined style={{ fontSize: 24, color: "#1677ff" }} />
      </Flex>

      {isSenior ? (
        <Tabs
          defaultActiveKey="team"
          items={[
            {
              key: "team",
              label: <span><TeamOutlined /> Team Overview</span>,
              children: <TeamDashboard data={teamData!} />
            },
            {
              key: "my",
              label: <span><UserOutlined /> My Attendance</span>,
              children: myLog
            }
          ]}
        />
      ) : myLog}
    </div>
  );
}
