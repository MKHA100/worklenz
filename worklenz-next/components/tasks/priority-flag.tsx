"use client";

import { FlagFilled } from "@ant-design/icons";
import { Tooltip } from "antd";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#8c8c8c",
  NORMAL: "#1677ff",
  HIGH: "#faad14",
  URGENT: "#ff4d4f"
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent"
};

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function PriorityFlag({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.NORMAL;
  return (
    <Tooltip title={`Priority: ${PRIORITY_LABELS[priority] ?? priority}`}>
      <FlagFilled style={{ color, fontSize: 13 }} />
    </Tooltip>
  );
}
