"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Table, Button, Input, Modal, Form, Select, Tag, Typography,
  Flex, Tooltip, Space, Popconfirm, App, Divider
} from "antd";
import {
  PlusOutlined, SearchOutlined, SyncOutlined,
  FolderOutlined, DeleteOutlined, EyeOutlined, GlobalOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useUserEvents } from "@/lib/realtime/use-user-events";
import { QK } from "@/lib/query-keys";
import { fetchProjects } from "@/lib/api/projects";

const { Title, Text } = Typography;

type Project = {
  id: string;
  name: string;
  code: string;
  officeName: string | null;
  officeCode: string | null;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

type Office = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  country: string | null;
};

type Props = {
  currentUserId: string;
  initialProjects: Project[];
  offices: Office[];
};

const COUNTRY_OPTIONS = [
  "Sri Lanka", "Australia", "Saudi Arabia", "United Kingdom", "United States",
  "United Arab Emirates", "Qatar", "Singapore", "India", "Canada", "Germany",
  "France", "Japan", "New Zealand", "Malaysia", "Bahrain", "Kuwait", "Oman"
];

export function ProjectsClient({ currentUserId, initialProjects, offices: initialOffices }: Props) {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showCreateOffice, setShowCreateOffice] = useState(false);
  const [creatingOffice, setCreatingOffice] = useState(false);
  const [form] = Form.useForm();
  const [officeForm] = Form.useForm();
  const [offices, setOffices] = useState<Office[]>(initialOffices);
  const hasRealtimeSyncedRef = useRef(false);

  const { data: projects = initialProjects } = useQuery({
    queryKey: QK.projects(),
    queryFn: fetchProjects,
    initialData: initialProjects,
    staleTime: 30_000,
  });

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  const createProject = useMutation({
    mutationFn: (values: { name: string; code: string; officeId?: string }) =>
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, code: values.code, office_id: values.officeId }),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.projects() });
      message.success("Project created");
      form.resetFields();
      officeForm.resetFields();
      setShowCreateOffice(false);
      setModalOpen(false);
    },
    onError: (e: Error) => message.error(e.message),
  });

  async function handleCreate(values: { name: string; code: string; officeId?: string }) {
    await createProject.mutateAsync(values);
  }

  async function handleCreateOffice() {
    let values: { officeName: string; country: string; city?: string };
    try {
      values = await officeForm.validateFields() as typeof values;
    } catch {
      return;
    }

    setCreatingOffice(true);
    try {
      const code = values.country.slice(0, 3).toUpperCase().replace(/\s/g, "") + Date.now().toString().slice(-3);
      const res = await fetch("/api/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name: values.officeName,
          city: values.city ?? null,
          country: values.country
        })
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to create office");
      }
      const { data } = await res.json() as { data: Office };
      setOffices((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      form.setFieldValue("officeId", data.id);
      officeForm.resetFields();
      setShowCreateOffice(false);
      message.success(`Office "${data.name}" created`);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Failed to create office");
    } finally {
      setCreatingOffice(false);
    }
  }

  const deleteProject = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Delete failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.projects() });
      message.success("Project deleted");
    },
    onError: () => message.error("Failed to delete project"),
  });

  async function handleDelete(id: string) {
    await deleteProject.mutateAsync(id);
  }

  useUserEvents(currentUserId, (event) => {
    if (event.source === "system") {
      if (event.status === "SUBSCRIBED") {
        if (hasRealtimeSyncedRef.current) queryClient.invalidateQueries({ queryKey: QK.projects() });
        else hasRealtimeSyncedRef.current = true;
      } else if (event.status === "TIMED_OUT" || event.status === "CHANNEL_ERROR" || event.status === "CLOSED") {
        queryClient.invalidateQueries({ queryKey: QK.projects() });
      }
      return;
    }

    if (event.source !== "system") {
      queryClient.invalidateQueries({ queryKey: QK.projects() });
    }
  });

  function handleModalClose() {
    setModalOpen(false);
    setShowCreateOffice(false);
    form.resetFields();
    officeForm.resetFields();
  }

  const columns: ColumnsType<Project> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Flex gap={8} align="center">
          <FolderOutlined style={{ color: "#1677ff" }} />
          <button
            onClick={() => router.push(`/prelim/projects/${record.id}`)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#262626", fontWeight: 500, fontSize: 14, padding: 0
            }}
          >
            {name}
          </button>
        </Flex>
      )
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (code) => <Tag>{code}</Tag>
    },
    {
      title: "Office",
      key: "office",
      width: 180,
      render: (_, record) =>
        record.officeName ? (
          <Flex gap={4} align="center">
            <GlobalOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
            <Text type="secondary">{record.officeName}</Text>
          </Flex>
        ) : (
          <Text type="secondary" style={{ fontStyle: "italic" }}>—</Text>
        )
    },
    {
      title: "Tasks",
      dataIndex: "taskCount",
      key: "taskCount",
      width: 100,
      sorter: (a, b) => a.taskCount - b.taskCount,
      render: (count) => (
        <Tag color={count > 0 ? "blue" : "default"}>{count}</Tag>
      )
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 160,
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      defaultSortOrder: "descend",
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Open project">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/prelim/projects/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this project?"
              description="All tasks will be deleted. This cannot be undone."
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Projects</Title>
          <Text type="secondary">{projects.length} project{projects.length !== 1 ? "s" : ""}</Text>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Project
          </Button>
        </Space>
      </Flex>

      <Flex style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search projects..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 320 }}
        />
      </Flex>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} projects` }}
        onRow={(record) => ({
          onDoubleClick: () => router.push(`/prelim/projects/${record.id}`)
        })}
        style={{ background: "white", borderRadius: 8 }}
        size="middle"
      />

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={modalOpen}
        onCancel={handleModalClose}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: "Project name is required" }]}
          >
            <Input placeholder="e.g. Tower Block A — Level 3" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Project Code"
            rules={[
              { required: true, message: "Code is required" },
              { max: 20, message: "Max 20 characters" }
            ]}
          >
            <Input placeholder="e.g. TBA-L3" style={{ textTransform: "uppercase" }} />
          </Form.Item>

          <Form.Item name="officeId" label="Office Location">
            <Select
              placeholder="Select office location"
              allowClear
              showSearch
              filterOption={(input, opt) =>
                (opt?.label?.toString() ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={offices.map((o) => ({
                value: o.id,
                label: `${o.name}${o.country ? ` (${o.country})` : ""}`
              }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "4px 0" }} />
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => setShowCreateOffice((v) => !v)}
                  >
                    {showCreateOffice ? "Cancel new office" : "Create new office location"}
                  </Button>
                </>
              )}
            />
          </Form.Item>

          {/* Inline create-office sub-form */}
          {showCreateOffice && (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>New Office Location</Text>
              <Form form={officeForm} layout="vertical" style={{ marginTop: 12 }}>
                <Form.Item
                  name="officeName"
                  label="Office Name"
                  rules={[{ required: true, message: "Name required" }]}
                >
                  <Input placeholder="e.g. Colombo Office" />
                </Form.Item>
                <Form.Item
                  name="country"
                  label="Country"
                  rules={[{ required: true, message: "Country required" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select or type a country"
                    mode="tags"
                    maxCount={1}
                    tokenSeparators={[","]}
                    options={COUNTRY_OPTIONS.map((c) => ({ value: c, label: c }))}
                  />
                </Form.Item>
                <Form.Item name="city" label="City (optional)">
                  <Input placeholder="e.g. Colombo" />
                </Form.Item>
                <Button
                  type="primary"
                  size="small"
                  loading={creatingOffice}
                  onClick={handleCreateOffice}
                >
                  Add Office
                </Button>
              </Form>
            </div>
          )}

          <Flex justify="flex-end" gap={8}>
            <Button onClick={handleModalClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={createProject.isPending}>Create Project</Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}
