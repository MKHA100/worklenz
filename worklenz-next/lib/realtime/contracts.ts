export type RealtimeBroadcastPayloadByEvent = {
  "task.created": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "created";
    timestamp?: string;
  };
  "task.updated": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "updated" | "status_changed" | "assignee_changed";
    status?: string;
    previousStatus?: string;
    assigneeId?: string | null;
    previousAssigneeId?: string | null;
    timestamp?: string;
  };
  "task.deleted": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "deleted";
    timestamp?: string;
  };
  "task.members.changed": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "members_changed";
    action: "added" | "removed" | "reassigned";
    timestamp?: string;
  };
  "project.members.changed": {
    projectId: string;
    affectedUserIds: string[];
    actorUserId: string;
    targetUserId: string;
    changeType: "project_members_changed";
    action: "added" | "removed";
    timestamp?: string;
  };
  "task.submission.changed": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "submission_changed";
    outcome?: string;
    timestamp?: string;
  };
  "task.attachment.changed": {
    projectId: string;
    taskId: string;
    affectedUserIds: string[];
    actorUserId: string;
    changeType: "attachment_changed";
    action: "added" | "removed";
    timestamp?: string;
  };
};

export type RealtimeBroadcastEventName = keyof RealtimeBroadcastPayloadByEvent;

export type RealtimeBroadcastEvent = {
  [K in RealtimeBroadcastEventName]: {
    source: "broadcast";
    name: K;
    payload: RealtimeBroadcastPayloadByEvent[K];
  }
}[RealtimeBroadcastEventName];

const BROADCAST_EVENT_NAMES: RealtimeBroadcastEventName[] = [
  "task.created",
  "task.updated",
  "task.deleted",
  "task.members.changed",
  "project.members.changed",
  "task.submission.changed",
  "task.attachment.changed"
];

export function isRealtimeBroadcastEventName(value: string): value is RealtimeBroadcastEventName {
  return BROADCAST_EVENT_NAMES.includes(value as RealtimeBroadcastEventName);
}

export const REALTIME_BROADCAST_EVENT_NAMES = BROADCAST_EVENT_NAMES;
