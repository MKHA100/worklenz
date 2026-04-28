export const QK = {
  homeStats: (userId: string) => ['home-stats', userId] as const,
  projects: () => ['projects'] as const,
  projectTasks: (projectId: string) => ['project-tasks', projectId] as const,
  projectMembers: (projectId: string) => ['project-members', projectId] as const,
  task: (taskId: string) => ['task', taskId] as const,
  taskTimeLogs: (taskId: string) => ['task-time-logs', taskId] as const,
  reviewQueue: () => ['review-queue'] as const,
};
