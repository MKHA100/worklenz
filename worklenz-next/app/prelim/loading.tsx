"use client";
import { Skeleton, Card, Row, Col } from "antd";

export default function Loading() {
  return (
    <div style={{ padding: 24 }}>
      <Skeleton.Input active style={{ width: 200, marginBottom: 24 }} size="large" />
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={12} sm={6}>
            <Card variant="borderless">
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
