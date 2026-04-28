"use client";
import { Skeleton, Card, Row, Col, Flex } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 180, marginBottom: 20 }} size="large" />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={12} sm={6}>
            <Card variant="borderless">
              <Skeleton active paragraph={{ rows: 0 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<Skeleton.Input active style={{ width: 120 }} />} variant="borderless">
            {[1, 2, 3, 4, 5].map((i) => (
              <Flex key={i} gap={12} align="center" style={{ marginBottom: 12 }}>
                <Skeleton.Avatar active size="small" />
                <Skeleton.Input active style={{ flex: 1 }} />
                <Skeleton.Button active size="small" style={{ width: 60 }} />
              </Flex>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<Skeleton.Input active style={{ width: 120 }} />} variant="borderless">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} active paragraph={{ rows: 1 }} style={{ marginBottom: 8 }} />
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
