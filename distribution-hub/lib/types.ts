export type JobState =
  | "READY"
  | "CLAIMED"
  | "SCHEDULED"
  | "UPLOADED"
  | "BLOCKED";

export type BufferState = "READY" | "IN_PROGRESS" | "COMPLETE" | "BLOCKED";

export type DistributionJob = {
  id: string;
  platformCode: string;
  platformName: string;
  platformColor: string;
  state: JobState;
  version: number;
  assigneeEmail: string | null;
  claimExpiresAt: string | null;
  blockedReason: string | null;
  scheduledAt: string | null;
  uploadedAt: string | null;
  externalUrl: string | null;
  updatedAt: string;
};

export type QueueItem = {
  id: string;
  channelCode: string;
  channelName: string;
  channelColor: string;
  title: string;
  contentType: string;
  driveUrl: string | null;
  producedAt: string | null;
  qaScore: number | null;
  bufferState: BufferState;
  jobs: DistributionJob[];
};

export type QueueResponse = {
  actor: string;
  membership: MemberContext;
  items: QueueItem[];
};

export type TeamRole = "ADMIN" | "OPERATOR" | "VIEWER";

export type MemberContext = {
  email: string;
  displayName: string;
  role: TeamRole;
  channelCodes: string[];
  canManageTeam: boolean;
};

export type TeamMember = {
  email: string;
  displayName: string;
  role: TeamRole;
  active: boolean;
  version: number;
  channelCodes: string[];
};

export type TeamChannel = {
  code: string;
  name: string;
};

export type TeamResponse = {
  members: TeamMember[];
  channels: TeamChannel[];
};

export type JobAction =
  | "claim"
  | "release"
  | "schedule"
  | "upload"
  | "block"
  | "unblock";
