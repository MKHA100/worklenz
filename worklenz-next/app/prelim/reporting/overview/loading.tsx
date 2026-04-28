"use client";
import { Skeleton, Card, Row, Col, Flex } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Flex align="center" gap={8} style={{ marginBottom: 24 }}>
        <Skeleton.Avatar active size="small" shape="square" />
        <Skeleton.Input active style={{ width: 200 }} size="large" />
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Col key={i} xs={12} sm={8} lg={4}>
            <Card variant="borderless">
              <Skeleton active paragraph={{ rows: 0 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card variant="borderless">
            <Flex vertical align="center" gap={16} style={{ padding: "16px 0" }}>
              <Skeleton.Avatar active size={160} shape="circle" />
              <Skeleton.Input active style={{ width: 180 }} size="small" />
            </Flex>
          </Card>
          <Card variant="borderless" style={{ marginTop: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} active paragraph={{ rows: 0 }} style={{ marginBottom: 12 }} />
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card variant="borderless">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Flex key={i} gap={12} align="center" style={{ marginBottom: 12 }}>
                <Skeleton.Input active style={{ flex: 2 }} size="small" />
                <Skeleton.Button active size="small" style={{ width: 80 }} />
                <Skeleton.Input active style={{ width: 100 }} size="small" />
                <Skeleton.Input active style={{ width: 60 }} size="small" />
              </Flex>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
