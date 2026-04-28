export async function fetchTask(taskId: string) {
  const res = await fetch(`/api/tasks/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  const { task } = await res.json();
  return task;
}

export async function fetchTaskTimeLogs(taskId: string) {
  const res = await fetch(`/api/tasks/${taskId}/time-logs`);
  if (!res.ok) throw new Error("Failed to fetch time logs");
  const { logs } = await res.json();
  return logs;
}

export async function patchTask(
  taskId: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update task");
  const { task } = await res.json();
  return task;
}
