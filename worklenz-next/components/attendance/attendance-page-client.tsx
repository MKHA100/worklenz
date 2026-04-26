"use client";

import { useState } from "react";
import {
  Card, Table, Tag, Button, Form, Select, DatePicker,
  Input, Typography, Flex, App, Row, Col
} from "antd";
import { PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  present: "success", absent: "error", half_day: "warning", on_leave: "processing"
};
const STATUS_LABELS: Record<string, string> = {
  present: "Present", absent: "Absent", half_day: "Half Day", on_leave: "On Leave"
};

type AttendanceRecord = {
  id: string; workDate: string; status: string;
  checkInTime: string; reason: string | null; officeName: string | null;
};
type Office = { id: string; name: string; code: string };
type Props = { records: AttendanceRecord[]; offices: Office[] };

const columns: ColumnsType<AttendanceRecord> = [
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
    render: (_, r) => r.officeName
      ? <Text>{r.officeName}</Text>
      : <Text type="secondary">—</Text>
  },
  {
    title: "Reason", dataIndex: "reason", key: "reason",
    render: (r: string | null) => r ?? <Text type="secondary">—</Text>
  }
];

export function AttendancePageClient({ records: initial, offices }: Props) {
  const { message } = App.useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const status = Form.useWatch("status", form);

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
        const e = await res.json();
        throw new Error(e.error ?? "Failed");
      }
      const { attendance } = await res.json();
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

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Attendance</Title>
          <Text type="secondary">Track your daily attendance</Text>
        </div>
        <CalendarOutlined style={{ fontSize: 24, color: "#1677ff" }} />
      </Flex>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="Log Attendance" bordered={false} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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
                    placeholder="Select office"
                    allowClear
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
            bordered={false}
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <Table
              dataSource={records} columns={columns} rowKey="id"
              pagination={{ pageSize: 10, size: "small" }}
              size="small"
              locale={{ emptyText: "No attendance records yet." }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
