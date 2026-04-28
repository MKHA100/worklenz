export async function fetchProjects() {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to fetch projects");
  const { projects } = await res.json();
  return projects;
}

export async function fetchProjectMembers(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/members`);
  if (!res.ok) throw new Error("Failed to fetch members");
  const { members } = await res.json();
  return members;
}

export async function fetchProjectTasks(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/tasks`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const { data } = await res.json();
  return data;
}
