import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type ActionItemAssignedProps = {
  recipientName: string;
  taskTitle: string;
  projectName: string;
  projectCode: string;
  assignedByName: string;
  dueDate?: string;
};

export function ActionItemAssigned({
  recipientName, taskTitle, projectName, projectCode, assignedByName, dueDate
}: ActionItemAssignedProps) {
  return (
    <Html>
      <Head />
      <Preview>Action item: {taskTitle}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "24px auto", backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <Heading style={{ marginTop: 0, color: "#722ed1" }}>Action Item Assigned</Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            <strong>{assignedByName}</strong> has assigned you an action item that does not require formal review.
            Complete it and mark it done directly.
          </Text>
          <Section style={{ backgroundColor: "#f9f0ff", borderRadius: "8px", border: "1px solid #d3adf7", padding: "16px", margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{taskTitle}</Text>
            <Text style={{ margin: "8px 0 0", color: "#595959", fontSize: 13 }}>
              Project: <strong>{projectCode}</strong> — {projectName}
            </Text>
            {dueDate && (
              <Text style={{ margin: "4px 0 0", color: "#d4380d", fontSize: 13 }}>
                Due: <strong>{dueDate}</strong>
              </Text>
            )}
          </Section>
          <Text>No submission required — just complete and mark as done in Prelim.</Text>
          <Text style={{ marginBottom: 0, marginTop: 24, color: "#8c8c8c", fontSize: 12 }}>
            Prelim — action item notification
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
