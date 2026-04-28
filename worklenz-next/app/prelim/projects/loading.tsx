"use client";
import { Skeleton, Card, Row, Col, Flex } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Skeleton.Input active style={{ width: 160 }} size="large" />
        <Flex gap={8}>
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 120 }} />
        </Flex>
      </Flex>
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Col key={i} xs={24} sm={12} lg={8}>
            <Card variant="borderless">
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
