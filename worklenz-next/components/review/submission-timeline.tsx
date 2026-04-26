"use client";

import { Button, Tag, Typography, Flex, App } from "antd";
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  PauseCircleOutlined, PaperClipOutlined, DownloadOutlined,
  UserOutlined
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

export type SubmissionAttachment = {
  id: string; fileKey: string; fileName: string;
  mimeType: string | null; fileSize: number | null; createdAt: string;
};

export type Submission = {
  id: string;
  roundNumber: number;
  submittedAt: string;
  submissionNote: string | null;
  outcome: string;
  reviewedAt: string | null;
  reviewComment: string | null;
  submittedBy: { id: string; fullName: string | null; email: string } | null;
  reviewedBy: { id: string; fullName: string | null; email: string } | null;
  attachments: SubmissionAttachment[];
};

function outcomeTag(outcome: string) {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING:           { color: "processing", icon: <SyncOutlined spin />, label: "Pending Review" },
    APPROVED:          { color: "success",    icon: <CheckCircleOutlined />, label: "Approved" },
    REVISION_REQUIRED: { color: "warning",    icon: <SyncOutlined />,       label: "Revision Required" },
    REJECTED:          { color: "error",      icon: <CloseCircleOutlined />, label: "Rejected" },
    ON_HOLD:           { color: "default",    icon: <PauseCircleOutlined />, label: "On Hold" }
  };
  const cfg = map[outcome] ?? map.PENDING;
  return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const diffH = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diffH < 1) return "< 1h ago";
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

type Props = { submissions: Submission[] };

export function SubmissionTimeline({ submissions }: Props) {
  const { message } = App.useApp();

  async function downloadFile(att: SubmissionAttachment) {
    try {
      const res = await fetch("/api/files/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: att.fileKey, mode: "download", expiresInSeconds: 300 })
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json() as { url: string };
      window.open(url, "_blank");
    } catch {
      message.error("Could not get download link");
    }
  }

  if (submissions.length === 0) {
    return <Text type="secondary" style={{ fontSize: 13 }}>No submission history yet.</Text>;
  }

  return (
    <div>
      {submissions.map((sub, idx) => {
        const isLast = idx === submissions.length - 1;
        return (
          <div
            key={sub.id}
            style={{
              position: "relative",
              paddingLeft: 20,
              paddingBottom: isLast ? 0 : 24,
              borderLeft: isLast ? "none" : "2px solid #f0f0f0",
              marginLeft: 8
            }}
          >
            {/* Round dot */}
            <div style={{
              position: "absolute", left: -9, top: 2,
              width: 16, height: 16, borderRadius: "50%",
              background: sub.outcome === "APPROVED" ? "#52c41a"
                : sub.outcome === "REJECTED" ? "#ff4d4f"
                : sub.outcome === "REVISION_REQUIRED" ? "#fa8c16"
                : "#1677ff",
              border: "2px solid #fff",
              boxShadow: "0 0 0 2px #f0f0f0"
            }} />

            {/* ---- QS Submission block ---- */}
            <div style={{
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 8
            }}>
              <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
                <Flex gap={6} align="center">
                  <UserOutlined style={{ color: "#52c41a", fontSize: 12 }} />
                  <Text strong style={{ fontSize: 13 }}>
                    {sub.submittedBy?.fullName ?? sub.submittedBy?.email ?? "QS"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    submitted Round {sub.roundNumber}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(sub.submittedAt).toLocaleString()} · {timeAgo(sub.submittedAt)}
                </Text>
              </Flex>

              {sub.submissionNote && (
                <Paragraph style={{ margin: "8px 0 0", fontSize: 13, color: "#135200" }}>
                  {sub.submissionNote}
                </Paragraph>
              )}

              {/* Attachments */}
              {sub.attachments.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {sub.attachments.map((att) => (
                    <Flex key={att.id} align="center" gap={8}
                      style={{ padding: "4px 0", borderTop: "1px solid #d9f7be" }}>
                      <PaperClipOutlined style={{ color: "#52c41a", flexShrink: 0 }} />
                      <Text style={{ fontSize: 12, flex: 1 }} ellipsis={{ tooltip: att.fileName }}>
                        {att.fileName}
                      </Text>
                      {att.fileSize && (
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                          {formatSize(att.fileSize)}
                        </Text>
                      )}
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadFile(att)}
                        style={{ flexShrink: 0 }}
                      />
                    </Flex>
                  ))}
                </div>
              )}
            </div>

            {/* ---- Reviewer Response block ---- */}
            {sub.outcome !== "PENDING" ? (
              <div style={{
                background: sub.outcome === "APPROVED" ? "#f0fff4"
                  : sub.outcome === "REJECTED" ? "#fff1f0"
                  : "#fffbe6",
                border: `1px solid ${
                  sub.outcome === "APPROVED" ? "#95de64"
                  : sub.outcome === "REJECTED" ? "#ffa39e"
                  : "#ffe58f"
                }`,
                borderRadius: 8,
                padding: "10px 14px",
                marginLeft: 12
              }}>
                <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
                  <Flex gap={6} align="center">
                    <UserOutlined style={{ fontSize: 12, color: "#8c8c8c" }} />
                    <Text strong style={{ fontSize: 13 }}>
                      {sub.reviewedBy?.fullName ?? sub.reviewedBy?.email ?? "Reviewer"}
                    </Text>
                    {outcomeTag(sub.outcome)}
                  </Flex>
                  {sub.reviewedAt && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(sub.reviewedAt).toLocaleString()} · {timeAgo(sub.reviewedAt)}
                    </Text>
                  )}
                </Flex>
                {sub.reviewComment && (
                  <Paragraph style={{ margin: "8px 0 0", fontSize: 13 }}>
                    {sub.reviewComment}
                  </Paragraph>
                )}
              </div>
            ) : (
              <div style={{
                background: "#e6f4ff",
                border: "1px dashed #91caff",
                borderRadius: 8,
                padding: "8px 14px",
                marginLeft: 12
              }}>
                <Flex gap={6} align="center">
                  <SyncOutlined spin style={{ color: "#1677ff", fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>Awaiting review...</Text>
                </Flex>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
