"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { localizeApiError } from "@/i18n/api-errors";
import { useLocale } from "@/i18n/locale-context";
import type { TreeDTO, NodeDTO } from "@/lib/types/tree";

interface TreeDetailProps {
  tree: TreeDTO;
  onTreeUpdated: (tree: TreeDTO) => void;
  onTreeDeleted: (treeId: string) => void;
  onStructureChanged?: () => void;
}

export function TreeDetail({
  tree,
  onTreeUpdated,
  onTreeDeleted,
  onStructureChanged,
}: TreeDetailProps) {
  const { locale, dictionary, t } = useLocale();
  const [nodes, setNodes] = useState<NodeDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNodes = useCallback(async () => {
    try {
      const response = await fetch(`/api/trees/${tree.id}`);
      const data = await response.json();
      if (!response.ok) {
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.treeDetail.loadFailed,
          ),
        );
        return;
      }
      setNodes(data.nodes);
    } catch {
      setError(dictionary.common.networkError);
    }
  }, [tree.id, locale, dictionary]);

  useEffect(() => {
    let active = true;

    fetch(`/api/trees/${tree.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(
            localizeApiError(
              data.error,
              locale,
              dictionary.treeDetail.loadFailed,
            ),
          );
          return;
        }
        setNodes(data.nodes);
      })
      .catch(() => {
        if (active) setError(dictionary.common.networkError);
      });

    return () => {
      active = false;
    };
  }, [tree.id, locale, dictionary]);

  async function handleDeleteTree() {
    if (
      !window.confirm(
        t(dictionary.treeDetail.deleteTreeConfirm, { title: tree.title }),
      )
    ) {
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
        {dictionary.treeDetail.loading}
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
          {dictionary.treeDetail.noBranches}
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
            if (updatedTree) {
              onTreeUpdated(updatedTree);
            } else {
              onStructureChanged?.();
            }
          }}
        />
      ))}

      <AddNodeForm
        treeId={tree.id}
        placeholder={dictionary.treeDetail.branchPlaceholder}
        buttonLabel={dictionary.treeDetail.addBranch}
        onAdded={() => {
          loadNodes();
          onStructureChanged?.();
        }}
      />

      <button
        type="button"
        onClick={handleDeleteTree}
        className="self-end text-xs text-forest-600/60 underline-offset-4 transition-colors hover:text-rose-600 hover:underline"
      >
        {dictionary.treeDetail.deleteTree}
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
  const { dictionary, t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  async function handleDeleteBranch() {
    if (
      tasks.length > 0 &&
      !window.confirm(
        t(dictionary.treeDetail.deleteBranchConfirm, {
          title: branch.title,
          count: tasks.length,
        }),
      )
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
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-forest-800 transition-colors hover:text-leaf-800"
        >
          <span aria-hidden className="text-xs text-forest-500">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="min-w-0 truncate">🌿 {branch.title}</span>
          {!expanded && tasks.length > 0 && (
            <span className="shrink-0 text-xs font-normal text-forest-500">
              ({tasks.length})
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleDeleteBranch}
          aria-label={t(dictionary.treeDetail.removeBranchAria, {
            title: branch.title,
          })}
          className="text-xs text-forest-600/50 transition-colors hover:text-rose-600"
        >
          {dictionary.common.remove}
        </button>
      </div>

      {expanded && (
        <>
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
              placeholder={dictionary.treeDetail.taskPlaceholder}
              buttonLabel={dictionary.treeDetail.addTask}
              compact
              onAdded={() => onChanged()}
            />
          </div>
        </>
      )}
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
  const { dictionary, t } = useLocale();
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

  async function toggleRecurring() {
    setPending(true);
    try {
      const response = await fetch(`/api/trees/${treeId}/nodes/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: !task.isRecurring }),
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
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
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
        {task.isCompleted && (
          <span
            aria-label={dictionary.treeDetail.fruitAria}
            title={dictionary.treeDetail.fruitTitle}
          >
            🍎
          </span>
        )}
      </label>
      <div className="flex shrink-0 items-center gap-3">
        <RecurringSwitch
          checked={task.isRecurring}
          disabled={pending}
          onChange={toggleRecurring}
        />
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t(dictionary.treeDetail.removeTaskAria, {
            title: task.title,
          })}
          className="text-xs text-forest-600/50 transition-colors hover:text-rose-600"
        >
          {dictionary.common.remove}
        </button>
      </div>
    </li>
  );
}

function RecurringSwitch({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const { dictionary } = useLocale();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-forest-700">
      <span>{dictionary.treeDetail.recurring}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-leaf-600" : "bg-forest-200"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
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
  const { locale, dictionary } = useLocale();
  const [title, setTitle] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
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
        body: JSON.stringify({ title, parentId, isRecurring }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.treeDetail.addFailed,
          ),
        );
        return;
      }

      setTitle("");
      setIsRecurring(false);
      onAdded();
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          className={`input-field min-w-48 flex-1 ${compact ? "py-2 text-sm" : ""}`}
          placeholder={placeholder}
        />
        {parentId && (
          <RecurringSwitch
            checked={isRecurring}
            onChange={() => setIsRecurring((current) => !current)}
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-ghost shrink-0 whitespace-nowrap"
        >
          {loading ? dictionary.common.loadingEllipsis : buttonLabel}
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
