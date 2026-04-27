"use client";

import { useState } from "react";
import { Flex, Typography, Tag, Tooltip, Empty } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const TZ = "Asia/Colombo";
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}
import { PriorityFlag } from "@/components/tasks/priority-flag";

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "#1677ff",
  IN_PROGRESS: "#fa8c16",
  SUBMITTED: "#722ed1",
  REVISION_REQUIRED: "#d4380d",
  ON_HOLD: "#8c8c8c",
  APPROVED: "#52c41a",
  REJECTED: "#cf1322",
  QUERY_RAISED: "#d4b106",
  EXTENSION_REQUESTED: "#08979c"
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "To Do", IN_PROGRESS: "In Progress", SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision", ON_HOLD: "On Hold",
  APPROVED: "Approved", REJECTED: "Rejected",
  QUERY_RAISED: "Query", EXTENSION_REQUESTED: "Extension"
};

export type GanttTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  assigneeName: string | null;
  projectName?: string;
};

type Props = {
  tasks: GanttTask[];
  groupByProject?: boolean;
};

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 240;
const MIN_CELL_WIDTH = 32;
const HEADER_HEIGHT = 48;

function getDateRange(tasks: GanttTask[]) {
  const dates: dayjs.Dayjs[] = [];
  for (const t of tasks) {
    if (t.startDate) dates.push(dayjs(t.startDate));
    if (t.dueDate) dates.push(dayjs(t.dueDate));
  }
  if (dates.length === 0) {
    const today = dayjs();
    return { start: today.startOf("week"), end: today.add(4, "week").endOf("week") };
  }
  const min = dates.reduce((a, b) => (a.isBefore(b) ? a : b));
  const max = dates.reduce((a, b) => (a.isAfter(b) ? a : b));
  return {
    start: min.subtract(3, "day").startOf("day"),
    end: max.add(3, "day").endOf("day")
  };
}

function buildWeekCols(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const weeks: { label: string; start: dayjs.Dayjs; days: number }[] = [];
  let cur = start.startOf("week");
  while (cur.isBefore(end)) {
    const weekEnd = cur.endOf("week");
    const effectiveEnd = weekEnd.isAfter(end) ? end : weekEnd;
    const days = effectiveEnd.diff(cur.startOf("day"), "day") + 1;
    weeks.push({ label: cur.format("DD MMM"), start: cur, days });
    cur = cur.add(1, "week");
  }
  return weeks;
}

export function GanttChart({ tasks, groupByProject }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const tasksWithDates = tasks.filter((t) => t.startDate || t.dueDate);

  if (tasksWithDates.length === 0) {
    return (
      <Empty
        description={
          <Text type="secondary">
            No tasks have start or due dates set.<br />
            Add dates to tasks to see them on the Gantt chart.
          </Text>
        }
        style={{ padding: "48px 0" }}
      />
    );
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange(tasksWithDates);
  const totalDays = rangeEnd.diff(rangeStart, "day") + 1;
  const weeks = buildWeekCols(rangeStart, rangeEnd);
  const cellWidth = Math.max(MIN_CELL_WIDTH, Math.floor(900 / totalDays));
  const timelineWidth = cellWidth * totalDays;
  const today = dayjs();
  const todayOffset = today.diff(rangeStart, "day");

  function getBarStyle(task: GanttTask) {
    const start = task.startDate ? dayjs(task.startDate) : (task.dueDate ? dayjs(task.dueDate) : null);
    const end = task.dueDate ? dayjs(task.dueDate) : (task.startDate ? dayjs(task.startDate) : null);
    if (!start || !end) return null;

    const left = start.diff(rangeStart, "day");
    const width = Math.max(1, end.diff(start, "day") + 1);
    const color = STATUS_COLORS[task.status] ?? "#1677ff";
    const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(today) && !["APPROVED", "REJECTED"].includes(task.status);

    return {
      left: left * cellWidth,
      width: width * cellWidth,
      color,
      isOverdue: !!isOverdue
    };
  }

  // Group tasks by project if requested
  const grouped = groupByProject
    ? Object.entries(
        tasksWithDates.reduce<Record<string, GanttTask[]>>((acc, t) => {
          const key = t.projectName ?? "Unknown Project";
          (acc[key] ??= []).push(t);
          return acc;
        }, {})
      )
    : [["Tasks", tasksWithDates] as [string, GanttTask[]]];

  const allRows: { task: GanttTask | null; label?: string; isGroupHeader?: boolean }[] = [];
  for (const [groupName, groupTasks] of grouped) {
    if (groupByProject) allRows.push({ task: null, label: groupName, isGroupHeader: true });
    for (const t of groupTasks) allRows.push({ task: t });
  }

  const totalHeight = HEADER_HEIGHT + allRows.length * ROW_HEIGHT;

  return (
    <div style={{ overflowX: "auto", border: "1px solid #f0f0f0", borderRadius: 8 }}>
      <div style={{ display: "flex", minWidth: LABEL_WIDTH + timelineWidth }}>
        {/* Left: task names */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: "1px solid #f0f0f0", background: "#fafafa" }}>
          {/* Header */}
          <div style={{ height: HEADER_HEIGHT, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid #f0f0f0" }}>
            <Text strong style={{ fontSize: 12, color: "#8c8c8c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Task</Text>
          </div>
          {allRows.map((row, i) => {
            if (row.isGroupHeader) {
              return (
                <div key={`grp-${i}`} style={{ height: ROW_HEIGHT, display: "flex", alignItems: "center", padding: "0 12px", background: "#f0f0f0", borderBottom: "1px solid #e8e8e8" }}>
                  <Text strong style={{ fontSize: 12 }}>{row.label}</Text>
                </div>
              );
            }
            const t = row.task!;
            return (
              <div key={t.id} style={{
                height: ROW_HEIGHT, display: "flex", alignItems: "center", padding: "0 12px", gap: 6,
                borderBottom: "1px solid #f5f5f5", background: hoveredId === t.id ? "#e6f4ff" : "white",
                transition: "background 0.15s"
              }}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <PriorityFlag priority={t.priority ?? "NORMAL"} />
                <Text style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </Text>
                <Tag color={STATUS_COLORS[t.status]} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </Tag>
              </div>
            );
          })}
        </div>

        {/* Right: timeline */}
        <div style={{ flex: 1, position: "relative", overflowX: "hidden" }}>
          {/* Week header */}
          <div style={{ height: HEADER_HEIGHT, display: "flex", borderBottom: "1px solid #f0f0f0", background: "#fafafa", position: "sticky", top: 0, zIndex: 2 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{
                width: w.days * cellWidth, flexShrink: 0, borderRight: "1px solid #f0f0f0",
                display: "flex", alignItems: "center", padding: "0 8px"
              }}>
                <Text style={{ fontSize: 11, color: "#595959", fontWeight: 500 }}>
                  <CalendarOutlined style={{ marginRight: 4 }} />
                  {w.label}
                </Text>
              </div>
            ))}
          </div>

          {/* Grid + bars */}
          <div style={{ position: "relative", height: totalHeight - HEADER_HEIGHT }}>
            {/* Today marker */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div style={{
                position: "absolute", top: 0, bottom: 0,
                left: todayOffset * cellWidth + cellWidth / 2,
                width: 2, background: "#ff4d4f", zIndex: 1, opacity: 0.7
              }} />
            )}

            {/* Vertical week grid lines */}
            {weeks.map((w, i) => (
              <div key={i} style={{
                position: "absolute", top: 0, bottom: 0,
                left: w.start.diff(rangeStart, "day") * cellWidth,
                width: 1, background: "#f0f0f0", zIndex: 0
              }} />
            ))}

            {/* Row backgrounds + bars */}
            {allRows.map((row, i) => {
              const top = i * ROW_HEIGHT;
              if (row.isGroupHeader) {
                return (
                  <div key={`grp-bg-${i}`} style={{ position: "absolute", top, left: 0, right: 0, height: ROW_HEIGHT, background: "#f0f0f0", borderBottom: "1px solid #e8e8e8" }} />
                );
              }
              const t = row.task!;
              const bar = getBarStyle(t);
              return (
                <div key={t.id} style={{
                  position: "absolute", top, left: 0, right: 0, height: ROW_HEIGHT,
                  background: hoveredId === t.id ? "#e6f4ff" : i % 2 === 0 ? "white" : "#fafafa",
                  borderBottom: "1px solid #f5f5f5", transition: "background 0.15s"
                }}
                  onMouseEnter={() => setHoveredId(t.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {bar && (
                    <Tooltip
                      title={
                        <div>
                          <div><strong>{t.title}</strong></div>
                          <div>Status: {STATUS_LABELS[t.status] ?? t.status}</div>
                          {t.startDate && <div>Start: {fmtDate(t.startDate)}</div>}
                          {t.dueDate && <div>Due: {fmtDate(t.dueDate)}</div>}
                          {t.assigneeName && <div>Assignee: {t.assigneeName}</div>}
                        </div>
                      }
                    >
                      <div style={{
                        position: "absolute",
                        left: bar.left + 2,
                        width: Math.max(bar.width - 4, 8),
                        top: 6, height: ROW_HEIGHT - 12,
                        background: bar.color,
                        borderRadius: 4,
                        opacity: bar.isOverdue ? 0.6 : 0.85,
                        cursor: "pointer",
                        outline: bar.isOverdue ? "2px dashed #ff4d4f" : undefined,
                        display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden"
                      }}>
                        <Text style={{ fontSize: 11, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {bar.width > 60 ? t.title : ""}
                        </Text>
                      </div>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <Flex gap={12} wrap style={{ padding: "8px 12px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <Flex key={k} gap={4} align="center">
            <div style={{ width: 12, height: 12, borderRadius: 2, background: STATUS_COLORS[k] }} />
            <Text style={{ fontSize: 11, color: "#595959" }}>{v}</Text>
          </Flex>
        ))}
        <Flex gap={4} align="center">
          <div style={{ width: 2, height: 12, background: "#ff4d4f" }} />
          <Text style={{ fontSize: 11, color: "#595959" }}>Today</Text>
        </Flex>
      </Flex>
    </div>
  );
}
