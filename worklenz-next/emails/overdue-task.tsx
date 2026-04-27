import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type OverdueTaskProps = {
  recipientName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  daysOverdue: number;
  assigneeName?: string;
};

export function OverdueTask({
  recipientName, taskTitle, projectName, dueDate, daysOverdue, assigneeName
}: OverdueTaskProps) {
  return (
    <Html>
      <Head />
      <Preview>Overdue ({daysOverdue}d): {taskTitle}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "24px auto", backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <Heading style={{ marginTop: 0, color: "#ff4d4f" }}>Overdue Task</Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            {assigneeName
              ? `The following task assigned to ${assigneeName} is now overdue.`
              : "Your task is overdue and requires immediate attention."}
          </Text>
          <Section style={{ backgroundColor: "#fff1f0", borderRadius: "8px", border: "1px solid #ffa39e", padding: "16px", margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{taskTitle}</Text>
            <Text style={{ margin: "8px 0 0", color: "#595959", fontSize: 13 }}>
              Project: <strong>{projectName}</strong>
            </Text>
            <Text style={{ margin: "4px 0 0", color: "#ff4d4f", fontSize: 13, fontWeight: 600 }}>
              Was due: {dueDate} ({daysOverdue} day{daysOverdue !== 1 ? "s" : ""} ago)
            </Text>
          </Section>
          <Text>Please take action immediately in Prelim.</Text>
          <Text style={{ marginBottom: 0, marginTop: 24, color: "#8c8c8c", fontSize: 12 }}>
            Prelim — automated overdue alert
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
