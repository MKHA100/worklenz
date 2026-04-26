"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table, Button, Input, Modal, Form, Select, Tag, Typography,
  Flex, Tooltip, Space, Popconfirm, App
} from "antd";
import {
  PlusOutlined, SearchOutlined, SyncOutlined,
  FolderOutlined, DeleteOutlined, EyeOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

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

type Props = { initialProjects: Project[] };

export function ProjectsClient({ initialProjects }: Props) {
  const { message } = App.useApp();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  async function handleCreate(values: { name: string; code: string; officeId?: string }) {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create project");
      }
      const { project } = await res.json();
      setProjects((prev) => [
        {
          id: project.id,
          name: project.name,
          code: project.code,
          officeName: null,
          officeCode: null,
          taskCount: 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        },
        ...prev
      ]);
      message.success("Project created");
      form.resetFields();
      setModalOpen(false);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Error creating project");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      message.success("Project deleted");
    } catch {
      message.error("Failed to delete project");
    }
  }

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const { projects: fresh } = await res.json();
        setProjects(fresh);
      }
    } finally {
      setLoading(false);
    }
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
      width: 160,
      render: (_, record) =>
        record.officeName ? (
          <Text type="secondary">{record.officeName}</Text>
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
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Projects</Title>
          <Text type="secondary">{projects.length} project{projects.length !== 1 ? "s" : ""}</Text>
        </div>
        <Space>
          <Tooltip title="Refresh">
            <Button icon={<SyncOutlined spin={loading} />} onClick={handleRefresh} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            New Project
          </Button>
        </Space>
      </Flex>

      {/* Search */}
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

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={loading}
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
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnHidden
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
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Create</Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}
