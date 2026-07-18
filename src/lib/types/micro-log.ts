export type MicroLogMood =
  | "calm"
  | "grateful"
  | "focused"
  | "joyful"
  | "tired"
  | "anxious"
  | "neutral";

export interface MicroLogNodeLinkDTO {
  treeId: string;
  nodeId: string;
  nodeLevel?: 2 | 3;
  nodeTitle: string;
}

export interface MicroLogDTO {
  id: string;
  content: string;
  mood: MicroLogMood;
  treeIds: string[];
  nodeLinks: MicroLogNodeLinkDTO[];
  loggedAt: string;
}
