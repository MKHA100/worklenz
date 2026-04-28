"use client";
import { Skeleton, Card, Flex, Row, Col } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <div>
          <Skeleton.Input active style={{ width: 280, marginBottom: 6 }} size="large" />
          <div>
            <Skeleton.Input active style={{ width: 180 }} size="small" />
          </div>
        </div>
        <Flex gap={8}>
          <Skeleton.Button active />
          <Skeleton.Button active style={{ width: 100 }} />
        </Flex>
      </Flex>

      {/* Progress bar area */}
      <Flex gap={12} align="center" style={{ marginBottom: 20 }}>
        <Skeleton.Input active style={{ width: 80 }} size="small" />
        <Skeleton.Input active style={{ width: 120 }} size="small" />
        <Skeleton.Input active style={{ width: 80 }} size="small" />
      </Flex>

      {/* Tab bar */}
      <Flex gap={24} style={{ borderBottom: "1px solid #f0f0f0", marginBottom: 16 }}>
        {["Task List", "Board", "Members", "Schedule"].map((tab) => (
          <Skeleton.Button key={tab} active size="small" style={{ width: 80, marginBottom: 8 }} />
        ))}
      </Flex>

      {/* Task rows */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Card key={i} style={{ marginBottom: 8 }} styles={{ body: { padding: "10px 16px" } }}>
          <Flex gap={12} align="center">
            <Skeleton.Avatar active size="small" />
            <Skeleton.Input active style={{ flex: 1 }} />
            <Skeleton.Button active size="small" style={{ width: 70 }} />
            <Skeleton.Button active size="small" style={{ width: 80 }} />
          </Flex>
        </Card>
      ))}
    </div>
  );
}
