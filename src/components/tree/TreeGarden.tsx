"use client";

import { FormEvent, useState } from "react";
import type { TreeDTO } from "@/lib/types/tree";
import type { ForestTreeData } from "@/lib/types/forest";
import { TreeDetail } from "./TreeDetail";
import { ForestScene } from "./ForestScene";

interface TreeGardenProps {
  initialTrees: TreeDTO[];
  initialForest: ForestTreeData[];
}

export function TreeGarden({ initialTrees, initialForest }: TreeGardenProps) {
  const [trees, setTrees] = useState<TreeDTO[]>(initialTrees);
  const [forest, setForest] = useState<ForestTreeData[]>(initialForest);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialTrees.length === 0);
  const [celebratedTree, setCelebratedTree] = useState<TreeDTO | null>(null);

  async function refreshForest() {
    try {
      const response = await fetch("/api/forest");
      const data = await response.json();
      if (response.ok) setForest(data.forest);
    } catch {
      // 森林全景是輔助視覺，刷新失敗時保留原畫面即可。
    }
  }

  function handleCreated(tree: TreeDTO) {
    setTrees((prev) => [tree, ...prev]);
    setShowForm(false);
    setExpandedId(tree.id);
    refreshForest();
  }

  function handleTreeUpdated(updated: TreeDTO) {
    setTrees((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    refreshForest();
  }

  function handleTreeDeleted(treeId: string) {
    setTrees((prev) => prev.filter((t) => t.id !== treeId));
    setExpandedId((current) => (current === treeId ? null : current));
    refreshForest();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900 sm:text-3xl">
            我的成長森林
          </h1>
          <p className="mt-2 text-forest-600">
            {trees.length === 0
              ? "還沒有樹。種下第一棵，代表一個你想靠近的方向。"
              : `你正在照顧 ${trees.length} 棵樹。每一片葉子都是你已經走過的路。`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-ghost shrink-0"
        >
          {showForm ? "先不種" : "🌱 種一棵新樹"}
        </button>
      </section>

      {forest.length > 0 && (
        <section className="card-surface overflow-hidden p-4 sm:p-5">
          <ForestScene forest={forest} />
        </section>
      )}

      {showForm && <NewTreeForm onCreated={handleCreated} />}

      <div className="flex flex-col gap-4">
        {trees.map((tree) => (
          <TreeCard
            key={tree.id}
            tree={tree}
            expanded={expandedId === tree.id}
            onToggle={() =>
              setExpandedId((current) => (current === tree.id ? null : tree.id))
            }
            onTreeUpdated={handleTreeUpdated}
            onTreeDeleted={handleTreeDeleted}
            onStructureChanged={refreshForest}
            onCelebrate={setCelebratedTree}
          />
        ))}
      </div>

      {celebratedTree && (
        <AchievementModal
          tree={celebratedTree}
          onClose={() => setCelebratedTree(null)}
        />
      )}
    </div>
  );
}

function NewTreeForm({ onCreated }: { onCreated: (tree: TreeDTO) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "種樹失敗，請稍後再試");
        return;
      }

      setTitle("");
      setDescription("");
      onCreated(data.tree);
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-surface flex flex-col gap-4 p-6"
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          這棵樹代表什麼目標？
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          className="input-field"
          placeholder="例如：成為更健康的自己"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          想對未來的自己說什麼？（選填）
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="input-field resize-none"
          placeholder="為什麼這個方向對你重要？"
        />
      </label>

      {error && (
        <p
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "種植中…" : "種下這棵樹"}
      </button>
    </form>
  );
}

function TreeCard({
  tree,
  expanded,
  onToggle,
  onTreeUpdated,
  onTreeDeleted,
  onStructureChanged,
  onCelebrate,
}: {
  tree: TreeDTO;
  expanded: boolean;
  onToggle: () => void;
  onTreeUpdated: (tree: TreeDTO) => void;
  onTreeDeleted: (treeId: string) => void;
  onStructureChanged: () => void;
  onCelebrate: (tree: TreeDTO) => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function toggleAchievement() {
    setUpdating(true);
    try {
      const response = await fetch(`/api/trees/${tree.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !tree.isCompleted }),
      });
      const data = await response.json();
      if (!response.ok) return;

      onTreeUpdated(data.tree);
      if (data.tree.isCompleted) onCelebrate(data.tree);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <article className="card-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 transition-colors hover:bg-forest-50/50 sm:p-6">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="text-2xl" aria-hidden>
            {tree.isCompleted ? "🌟" : "🌳"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-medium text-forest-900">
              {tree.title}
            </h2>
            {tree.description && (
              <p className="mt-1 text-sm text-forest-600">
                {tree.description}
              </p>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-3 text-sm text-forest-600">
          {tree.stats.leafCount > 0 && (
            <span title="累積的微小實踐">🍃 {tree.stats.leafCount}</span>
          )}
          {tree.stats.fruitCount > 0 && (
            <span title="目前完成的任務">🍎 {tree.stats.fruitCount}</span>
          )}
          <button
            type="button"
            onClick={toggleAchievement}
            disabled={updating}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              tree.isCompleted
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "border border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
            }`}
          >
            {updating ? "…" : tree.isCompleted ? "✓ 已達成" : "標示達成"}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="text-forest-600/60"
          >
            {expanded ? "收起" : "展開"}
          </button>
        </div>
      </div>

      {expanded && (
        <TreeDetail
          tree={tree}
          onTreeUpdated={onTreeUpdated}
          onTreeDeleted={onTreeDeleted}
          onStructureChanged={onStructureChanged}
        />
      )}
    </article>
  );
}

function AchievementModal({
  tree,
  onClose,
}: {
  tree: TreeDTO;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-6xl" aria-hidden>
          🎉
        </div>
        <h2
          id="achievement-title"
          className="mt-5 text-2xl font-semibold text-forest-900"
        >
          恭喜你達成了這個目標！
        </h2>
        <p className="mt-3 text-lg font-medium text-leaf-700">
          「{tree.title}」
        </p>
        <p className="mt-4 leading-relaxed text-forest-600">
          每一片葉子、每一顆果實，都是你真實走過的路。請好好收藏這份屬於你的成長。
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-6">
          收下這份喜悅
        </button>
      </div>
    </div>
  );
}
