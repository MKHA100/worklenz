import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type TaskAssignedProps = {
  recipientName: string;
  taskTitle: string;
  projectName: string;
  projectCode: string;
  assignedByName: string;
  dueDate?: string;
  tradeCode?: string;
};

export function TaskAssigned({
  recipientName, taskTitle, projectName, projectCode,
  assignedByName, dueDate, tradeCode
}: TaskAssignedProps) {
  return (
    <Html>
      <Head />
      <Preview>New task assigned: {taskTitle}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "24px auto", backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <Heading style={{ marginTop: 0, color: "#1677ff" }}>New Task Assigned</Heading>
          <Text>Hi {recipientName},</Text>
          <Text>A new task has been assigned to you on <strong>Prelim</strong>.</Text>
          <Section style={{ backgroundColor: "#f0f7ff", borderRadius: "8px", border: "1px solid #bae0ff", padding: "16px", margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{taskTitle}</Text>
            <Text style={{ margin: "8px 0 0", color: "#595959", fontSize: 13 }}>
              Project: <strong>{projectCode}</strong> — {projectName}
            </Text>
            {tradeCode && (
              <Text style={{ margin: "4px 0 0", color: "#595959", fontSize: 13 }}>
                Trade Code: <strong>{tradeCode}</strong>
              </Text>
            )}
            {dueDate && (
              <Text style={{ margin: "4px 0 0", color: "#d4380d", fontSize: 13 }}>
                Due: <strong>{dueDate}</strong>
              </Text>
            )}
          </Section>
          <Text>Assigned by <strong>{assignedByName}</strong>. Log in to Prelim to get started.</Text>
          <Text style={{ marginBottom: 0, marginTop: 24, color: "#8c8c8c", fontSize: 12 }}>
            Prelim — task notification
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
