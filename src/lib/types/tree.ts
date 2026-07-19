export type TreeStatus = "active" | "paused" | "archived";

export interface TreeStats {
  leafCount: number;
  fruitCount: number;
  branchCount: number;
  taskCount: number;
}

export interface TreeDTO {
  id: string;
  title: string;
  description?: string;
  status: TreeStatus;
  isCompleted: boolean;
  completedAt?: string;
  manualOrder?: number;
  stats: TreeStats;
  createdAt: string;
}

export interface NodeDTO {
  id: string;
  treeId: string;
  parentId: string;
  level: 2 | 3;
  type: "branch" | "task";
  title: string;
  order: number;
  isCompleted: boolean;
  completedAt?: string;
  fruitEarned: boolean;
  isRecurring: boolean;
}
