"use client";

import { type DragEvent, FormEvent, type ReactNode, useState } from "react";
import { localizeApiError } from "@/i18n/api-errors";
import { useLocale } from "@/i18n/locale-context";
import type { TreeDTO } from "@/lib/types/tree";
import type { ForestTreeData } from "@/lib/types/forest";
import { TreeDetail } from "./TreeDetail";
import { ForestScene } from "./ForestScene";

interface TreeGardenProps {
  initialTrees: TreeDTO[];
  initialForest: ForestTreeData[];
}

export function TreeGarden({ initialTrees, initialForest }: TreeGardenProps) {
  const { locale, dictionary, t } = useLocale();
  const [trees, setTrees] = useState<TreeDTO[]>(initialTrees);
  const [forest, setForest] = useState<ForestTreeData[]>(initialForest);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialTrees.length === 0);
  const [celebratedTree, setCelebratedTree] = useState<TreeDTO | null>(null);
  const [draggedTreeId, setDraggedTreeId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const activeTrees = trees
    .filter((tree) => !tree.isCompleted)
    .sort(compareActiveTrees);
  const completedTrees = trees
    .filter((tree) => tree.isCompleted)
    .sort(compareCompletedTrees);

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

  async function reorderActiveTree(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const sourceIndex = activeTrees.findIndex((tree) => tree.id === sourceId);
    const targetIndex = activeTrees.findIndex((tree) => tree.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...activeTrees];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const previousOrders = new Map(
      activeTrees.map((tree) => [tree.id, tree.manualOrder]),
    );
    const nextOrders = new Map(
      reordered.map((tree, index) => [tree.id, index]),
    );

    setReorderError(null);
    setTrees((current) =>
      current.map((tree) =>
        nextOrders.has(tree.id)
          ? { ...tree, manualOrder: nextOrders.get(tree.id) }
          : tree,
      ),
    );

    try {
      const response = await fetch("/api/trees/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeIds: reordered.map((tree) => tree.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          localizeApiError(
            data.error,
            locale,
            dictionary.garden.reorderFailed,
          ),
        );
      }
    } catch (error) {
      setTrees((current) =>
        current.map((tree) =>
          previousOrders.has(tree.id)
            ? { ...tree, manualOrder: previousOrders.get(tree.id) }
            : tree,
        ),
      );
      setReorderError(
        error instanceof Error
          ? error.message
          : dictionary.garden.reorderFailed,
      );
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    if (draggedTreeId) reorderActiveTree(draggedTreeId, targetId);
    setDraggedTreeId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900 sm:text-3xl">
            {dictionary.garden.title}
          </h1>
          <p className="mt-2 text-forest-600">
            {trees.length === 0
              ? dictionary.garden.empty
              : t(dictionary.garden.caring, { count: trees.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-ghost shrink-0"
        >
          {showForm ? dictionary.garden.notNow : dictionary.garden.plantNew}
        </button>
      </section>

      {forest.length > 0 && (
        <section className="card-surface overflow-hidden p-4 sm:p-5">
          <ForestScene forest={forest} />
        </section>
      )}

      {showForm && <NewTreeForm onCreated={handleCreated} />}

      <section aria-labelledby="active-trees-title">
        <h2
          id="active-trees-title"
          className="mb-3 text-lg font-semibold text-forest-900"
        >
          {dictionary.garden.activeSection}
        </h2>
        {reorderError && (
          <p
            className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {reorderError}
          </p>
        )}
        <div className="flex flex-col gap-4">
          {activeTrees.map((tree, index) => (
            <div
              key={tree.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, tree.id)}
              className={
                draggedTreeId === tree.id
                  ? "rounded-2xl opacity-55"
                  : "rounded-2xl"
              }
            >
              <TreeCard
                tree={tree}
                expanded={expandedId === tree.id}
                dragHandle={
                  <span
                    role="button"
                    tabIndex={0}
                    draggable
                    aria-label={t(dictionary.garden.dragAria, {
                      title: tree.title,
                    })}
                    title={t(dictionary.garden.dragAria, {
                      title: tree.title,
                    })}
                    onDragStart={(event) => {
                      setDraggedTreeId(tree.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggedTreeId(null)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp" && index > 0) {
                        event.preventDefault();
                        reorderActiveTree(tree.id, activeTrees[index - 1].id);
                      }
                      if (
                        event.key === "ArrowDown" &&
                        index < activeTrees.length - 1
                      ) {
                        event.preventDefault();
                        reorderActiveTree(tree.id, activeTrees[index + 1].id);
                      }
                    }}
                    className="cursor-grab select-none rounded-lg px-1.5 py-2 text-xl leading-none text-forest-600/70 hover:bg-forest-50 hover:text-forest-900 focus:outline-none focus:ring-2 focus:ring-leaf-600 active:cursor-grabbing"
                  >
                    ≡
                  </span>
                }
                onToggle={() =>
                  setExpandedId((current) =>
                    current === tree.id ? null : tree.id,
                  )
                }
                onTreeUpdated={handleTreeUpdated}
                onTreeDeleted={handleTreeDeleted}
                onStructureChanged={refreshForest}
                onCelebrate={setCelebratedTree}
              />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="completed-trees-title">
        <h2
          id="completed-trees-title"
          className="mb-3 text-lg font-semibold text-forest-900"
        >
          {dictionary.garden.completedSection}
        </h2>
        {completedTrees.length === 0 ? (
          <p className="rounded-xl bg-forest-50/70 px-4 py-4 text-sm text-forest-600">
            {dictionary.garden.noCompleted}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {completedTrees.map((tree) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                expanded={expandedId === tree.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === tree.id ? null : tree.id,
                  )
                }
                onTreeUpdated={handleTreeUpdated}
                onTreeDeleted={handleTreeDeleted}
                onStructureChanged={refreshForest}
                onCelebrate={setCelebratedTree}
              />
            ))}
          </div>
        )}
      </section>

      {celebratedTree && (
        <AchievementModal
          tree={celebratedTree}
          onClose={() => setCelebratedTree(null)}
        />
      )}
    </div>
  );
}

function compareActiveTrees(a: TreeDTO, b: TreeDTO) {
  if (a.manualOrder !== undefined || b.manualOrder !== undefined) {
    if (a.manualOrder === undefined) return 1;
    if (b.manualOrder === undefined) return -1;
    if (a.manualOrder !== b.manualOrder) {
      return a.manualOrder - b.manualOrder;
    }
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function compareCompletedTrees(a: TreeDTO, b: TreeDTO) {
  const aTime = new Date(a.completedAt ?? a.createdAt).getTime();
  const bTime = new Date(b.completedAt ?? b.createdAt).getTime();
  return bTime - aTime;
}

function NewTreeForm({ onCreated }: { onCreated: (tree: TreeDTO) => void }) {
  const { locale, dictionary } = useLocale();
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
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.garden.plantFailed,
          ),
        );
        return;
      }

      setTitle("");
      setDescription("");
      onCreated(data.tree);
    } catch {
      setError(dictionary.common.networkError);
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
          {dictionary.garden.goalLabel}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          className="input-field"
          placeholder={dictionary.garden.goalPlaceholder}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          {dictionary.garden.noteLabel}
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="input-field resize-none"
          placeholder={dictionary.garden.notePlaceholder}
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
        {loading ? dictionary.garden.planting : dictionary.garden.plant}
      </button>
    </form>
  );
}

function TreeCard({
  tree,
  expanded,
  dragHandle,
  onToggle,
  onTreeUpdated,
  onTreeDeleted,
  onStructureChanged,
  onCelebrate,
}: {
  tree: TreeDTO;
  expanded: boolean;
  dragHandle?: ReactNode;
  onToggle: () => void;
  onTreeUpdated: (tree: TreeDTO) => void;
  onTreeDeleted: (treeId: string) => void;
  onStructureChanged: () => void;
  onCelebrate: (tree: TreeDTO) => void;
}) {
  const { dictionary } = useLocale();
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
        {dragHandle}
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
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
            <span title={dictionary.garden.leafTitle}>
              🍃 {tree.stats.leafCount}
            </span>
          )}
          {tree.stats.fruitCount > 0 && (
            <span title={dictionary.garden.fruitTitle}>
              🍎 {tree.stats.fruitCount}
            </span>
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
            {updating
              ? dictionary.common.loadingEllipsis
              : tree.isCompleted
                ? dictionary.garden.achieved
                : dictionary.garden.markAchieved}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="text-forest-600/60"
          >
            {expanded ? dictionary.common.collapse : dictionary.common.expand}
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
  const { dictionary } = useLocale();
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
          {dictionary.garden.celebrateTitle}
        </h2>
        <p className="mt-3 text-lg font-medium text-leaf-700">
          「{tree.title}」
        </p>
        <p className="mt-4 leading-relaxed text-forest-600">
          {dictionary.garden.celebrateBody}
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-6">
          {dictionary.garden.celebrateClose}
        </button>
      </div>
    </div>
  );
}
