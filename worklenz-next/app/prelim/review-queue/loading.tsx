"use client";
import { Skeleton, Card, Row, Col, Flex } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Skeleton.Input active style={{ width: 160 }} size="large" />
          <div style={{ marginTop: 4 }}>
            <Skeleton.Input active style={{ width: 220 }} size="small" />
          </div>
        </div>
        <Skeleton.Avatar active size="default" />
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3].map((i) => (
          <Col key={i} xs={8}>
            <Card variant="borderless" style={{ textAlign: "center" }}>
              <Skeleton active paragraph={{ rows: 0 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} style={{ marginBottom: 8 }} styles={{ body: { padding: "12px 16px" } }}>
          <Flex gap={16} align="center">
            <div style={{ flex: 1 }}>
              <Skeleton.Input active style={{ width: "60%", marginBottom: 6 }} />
              <div><Skeleton.Input active style={{ width: "40%" }} size="small" /></div>
            </div>
            <Skeleton.Avatar active size="small" />
            <Skeleton.Input active style={{ width: 60 }} size="small" />
            <Skeleton.Button active size="small" style={{ width: 70 }} />
          </Flex>
        </Card>
      ))}
    </div>
  );
}
