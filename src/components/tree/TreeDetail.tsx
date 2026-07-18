"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { TreeDTO, NodeDTO } from "@/lib/types/tree";

interface TreeDetailProps {
  tree: TreeDTO;
  onTreeUpdated: (tree: TreeDTO) => void;
  onTreeDeleted: (treeId: string) => void;
}

export function TreeDetail({
  tree,
  onTreeUpdated,
  onTreeDeleted,
}: TreeDetailProps) {
  const [nodes, setNodes] = useState<NodeDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNodes = useCallback(async () => {
    try {
      const response = await fetch(`/api/trees/${tree.id}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "無法載入這棵樹");
        return;
      }
      setNodes(data.nodes);
    } catch {
      setError("網路連線失敗，請稍後再試");
    }
  }, [tree.id]);

  useEffect(() => {
    let active = true;

    fetch(`/api/trees/${tree.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "無法載入這棵樹");
          return;
        }
        setNodes(data.nodes);
      })
      .catch(() => {
        if (active) setError("網路連線失敗，請稍後再試");
      });

    return () => {
      active = false;
    };
  }, [tree.id]);

  async function handleDeleteTree() {
    if (!window.confirm(`確定要移除「${tree.title}」嗎？底下的枝與任務都會一併移除。`)) {
      return;
    }
    const response = await fetch(`/api/trees/${tree.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      onTreeDeleted(tree.id);
    }
  }

  if (error) {
    return (
      <p className="border-t border-forest-100/80 px-6 py-4 text-sm text-rose-700">
        {error}
      </p>
    );
  }

  if (!nodes) {
    return (
      <p className="border-t border-forest-100/80 px-6 py-4 text-sm text-forest-600">
        樹葉沙沙作響中…
      </p>
    );
  }

  const branches = nodes.filter((n) => n.level === 2);
  const tasksByBranch = new Map<string, NodeDTO[]>();
  for (const node of nodes) {
    if (node.level !== 3) continue;
    const list = tasksByBranch.get(node.parentId) ?? [];
    list.push(node);
    tasksByBranch.set(node.parentId, list);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-forest-100/80 p-5 sm:p-6">
      {branches.length === 0 && (
        <p className="text-sm text-forest-600">
          這棵樹還沒有樹枝。長出第一根，代表一個往目標靠近的子方向。
        </p>
      )}

      {branches.map((branch) => (
        <BranchSection
          key={branch.id}
          treeId={tree.id}
          branch={branch}
          tasks={tasksByBranch.get(branch.id) ?? []}
          onChanged={(updatedTree) => {
            loadNodes();
            if (updatedTree) onTreeUpdated(updatedTree);
          }}
        />
      ))}

      <AddNodeForm
        treeId={tree.id}
        placeholder="新的子方向，例如：規律運動"
        buttonLabel="長出樹枝"
        onAdded={() => loadNodes()}
      />

      <button
        type="button"
        onClick={handleDeleteTree}
        className="self-end text-xs text-forest-600/60 underline-offset-4 transition-colors hover:text-rose-600 hover:underline"
      >
        移除這棵樹
      </button>
    </div>
  );
}

function BranchSection({
  treeId,
  branch,
  tasks,
  onChanged,
}: {
  treeId: string;
  branch: NodeDTO;
  tasks: NodeDTO[];
  onChanged: (tree?: TreeDTO) => void;
}) {
  async function handleDeleteBranch() {
    if (
      tasks.length > 0 &&
      !window.confirm(`移除「${branch.title}」會一併移除底下 ${tasks.length} 個任務，確定嗎？`)
    ) {
      return;
    }
    const response = await fetch(`/api/trees/${treeId}/nodes/${branch.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (response.ok) onChanged(data.tree);
  }

  return (
    <section className="rounded-xl bg-forest-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-forest-800">🌿 {branch.title}</h3>
        <button
          type="button"
          onClick={handleDeleteBranch}
          aria-label={`移除樹枝 ${branch.title}`}
          className="text-xs text-forest-600/50 transition-colors hover:text-rose-600"
        >
          移除
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            treeId={treeId}
            task={task}
            onChanged={onChanged}
          />
        ))}
      </ul>

      <div className="mt-3">
        <AddNodeForm
          treeId={treeId}
          parentId={branch.id}
          placeholder="小小的一步，例如：每天散步 10 分鐘"
          buttonLabel="加上任務"
          compact
          onAdded={() => onChanged()}
        />
      </div>
    </section>
  );
}

function TaskRow({
  treeId,
  task,
  onChanged,
}: {
  treeId: string;
  task: NodeDTO;
  onChanged: (tree?: TreeDTO) => void;
}) {
  const [pending, setPending] = useState(false);

  async function toggleComplete() {
    setPending(true);
    try {
      const response = await fetch(`/api/trees/${treeId}/nodes/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      const data = await response.json();
      if (response.ok) onChanged(data.tree);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    const response = await fetch(`/api/trees/${treeId}/nodes/${task.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (response.ok) onChanged(data.tree);
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={task.isCompleted}
          disabled={pending}
          onChange={toggleComplete}
          className="size-4 accent-leaf-700"
        />
        <span
          className={
            task.isCompleted
              ? "text-sm text-forest-600/70"
              : "text-sm text-forest-900"
          }
        >
          {task.title}
        </span>
        {task.fruitEarned && (
          <span aria-label="已結果實" title="這個任務曾經完成，果實不會消失">
            🍎
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={handleDelete}
        aria-label={`移除任務 ${task.title}`}
        className="text-xs text-forest-600/50 transition-colors hover:text-rose-600"
      >
        移除
      </button>
    </li>
  );
}

function AddNodeForm({
  treeId,
  parentId,
  placeholder,
  buttonLabel,
  compact = false,
  onAdded,
}: {
  treeId: string;
  parentId?: string;
  placeholder: string;
  buttonLabel: string;
  compact?: boolean;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "新增失敗，請稍後再試");
        return;
      }

      setTitle("");
      onAdded();
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          className={`input-field ${compact ? "py-2 text-sm" : ""}`}
          placeholder={placeholder}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-ghost shrink-0 whitespace-nowrap"
        >
          {loading ? "…" : buttonLabel}
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
