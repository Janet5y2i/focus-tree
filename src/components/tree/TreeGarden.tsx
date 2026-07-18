"use client";

import { FormEvent, useState } from "react";
import type { TreeDTO } from "@/lib/types/tree";
import { TreeDetail } from "./TreeDetail";

interface TreeGardenProps {
  initialTrees: TreeDTO[];
}

export function TreeGarden({ initialTrees }: TreeGardenProps) {
  const [trees, setTrees] = useState<TreeDTO[]>(initialTrees);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialTrees.length === 0);

  function handleCreated(tree: TreeDTO) {
    setTrees((prev) => [tree, ...prev]);
    setShowForm(false);
    setExpandedId(tree.id);
  }

  function handleTreeUpdated(updated: TreeDTO) {
    setTrees((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTreeDeleted(treeId: string) {
    setTrees((prev) => prev.filter((t) => t.id !== treeId));
    setExpandedId((current) => (current === treeId ? null : current));
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
          />
        ))}
      </div>
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
}: {
  tree: TreeDTO;
  expanded: boolean;
  onToggle: () => void;
  onTreeUpdated: (tree: TreeDTO) => void;
  onTreeDeleted: (treeId: string) => void;
}) {
  return (
    <article className="card-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-forest-50/50 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🌳
          </span>
          <div>
            <h2 className="text-lg font-medium text-forest-900">
              {tree.title}
            </h2>
            {tree.description && (
              <p className="mt-1 text-sm text-forest-600">
                {tree.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm text-forest-600">
          {tree.stats.leafCount > 0 && (
            <span title="累積的微小實踐">🍃 {tree.stats.leafCount}</span>
          )}
          {tree.stats.fruitCount > 0 && (
            <span title="結出的果實">🍎 {tree.stats.fruitCount}</span>
          )}
          <span className="text-forest-600/60">{expanded ? "收起" : "展開"}</span>
        </div>
      </button>

      {expanded && (
        <TreeDetail
          tree={tree}
          onTreeUpdated={onTreeUpdated}
          onTreeDeleted={onTreeDeleted}
        />
      )}
    </article>
  );
}
