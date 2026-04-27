import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

type DueDateReminderProps = {
  recipientName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  daysUntilDue: number;
};

export function DueDateReminder({
  recipientName, taskTitle, projectName, dueDate, daysUntilDue
}: DueDateReminderProps) {
  const urgent = daysUntilDue <= 1;
  return (
    <Html>
      <Head />
      <Preview>{urgent ? "Due tomorrow" : `Due in ${daysUntilDue} days`}: {taskTitle}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "24px auto", backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <Heading style={{ marginTop: 0, color: urgent ? "#ff4d4f" : "#faad14" }}>
            {urgent ? "Due Tomorrow" : `Due in ${daysUntilDue} Days`}
          </Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            This is a reminder that your task is due {urgent ? "tomorrow" : `in ${daysUntilDue} days`}.
          </Text>
          <Section style={{ backgroundColor: urgent ? "#fff1f0" : "#fffbe6", borderRadius: "8px", border: `1px solid ${urgent ? "#ffa39e" : "#ffe58f"}`, padding: "16px", margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{taskTitle}</Text>
            <Text style={{ margin: "8px 0 0", color: "#595959", fontSize: 13 }}>
              Project: <strong>{projectName}</strong>
            </Text>
            <Text style={{ margin: "4px 0 0", color: urgent ? "#ff4d4f" : "#d48806", fontSize: 13, fontWeight: 600 }}>
              Due: {dueDate}
            </Text>
          </Section>
          <Text>Please ensure your work is submitted on time in Prelim.</Text>
          <Text style={{ marginBottom: 0, marginTop: 24, color: "#8c8c8c", fontSize: 12 }}>
            Prelim — automated due date reminder
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
