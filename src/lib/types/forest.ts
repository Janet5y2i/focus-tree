export interface ForestTaskData {
  id: string;
  isCompleted: boolean;
}

export interface ForestBranchData {
  id: string;
  title: string;
  leafCount: number;
  tasks: ForestTaskData[];
}

export interface ForestTreeData {
  id: string;
  title: string;
  isCompleted: boolean;
  /** 只連結到整棵樹（沒有指定樹枝）的記錄，畫在樹冠上 */
  trunkLeafCount: number;
  branches: ForestBranchData[];
}
