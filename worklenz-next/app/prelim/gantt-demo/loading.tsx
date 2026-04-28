"use client";
import { Skeleton, Flex } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 160, marginBottom: 8 }} size="large" />
      <div style={{ marginBottom: 20 }}>
        <Skeleton.Input active style={{ width: 240 }} size="small" />
      </div>
      <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden" }}>
        {/* Header row */}
        <Flex style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0", padding: "12px 16px" }} gap={16}>
          <Skeleton.Input active style={{ width: 200 }} size="small" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton.Input key={i} active style={{ flex: 1 }} size="small" />
          ))}
        </Flex>
        {/* Task rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Flex key={i} style={{ borderBottom: "1px solid #f5f5f5", padding: "8px 16px" }} gap={16} align="center">
            <Skeleton.Input active style={{ width: 180 }} size="small" />
            <div style={{ flex: 1, position: "relative" }}>
              <Skeleton.Button
                active
                style={{
                  width: `${20 + Math.random() * 50}%`,
                  marginLeft: `${Math.random() * 30}%`,
                  height: 20
                }}
              />
            </div>
          </Flex>
        ))}
      </div>
    </div>
  );
}
