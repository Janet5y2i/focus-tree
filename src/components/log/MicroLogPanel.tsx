"use client";

import { FormEvent, useState } from "react";
import { localizeApiError } from "@/i18n/api-errors";
import type { Dictionary } from "@/i18n/dictionaries/zh-TW";
import { useLocale } from "@/i18n/locale-context";
import type { MicroLogDTO, MicroLogMood } from "@/lib/types/micro-log";
import type { NodeDTO, TreeDTO } from "@/lib/types/tree";

interface MicroLogPanelProps {
  initialTrees: TreeDTO[];
  initialLogs: MicroLogDTO[];
  initialRecurringTasks: NodeDTO[];
}

function getMoodOptions(dictionary: Dictionary): {
  value: MicroLogMood;
  emoji: string;
  label: string;
}[] {
  return [
    { value: "neutral", emoji: "🌿", label: dictionary.log.moodNeutral },
    { value: "calm", emoji: "😌", label: dictionary.log.moodCalm },
    { value: "grateful", emoji: "🙏", label: dictionary.log.moodGrateful },
    { value: "focused", emoji: "🎯", label: dictionary.log.moodFocused },
    { value: "joyful", emoji: "😊", label: dictionary.log.moodJoyful },
    { value: "tired", emoji: "😮‍💨", label: dictionary.log.moodTired },
    { value: "anxious", emoji: "🌧️", label: dictionary.log.moodAnxious },
    { value: "sad", emoji: "😢", label: dictionary.log.moodSad },
  ];
}

function toggleMoodValue(
  current: MicroLogMood[],
  value: MicroLogMood,
): MicroLogMood[] {
  return current.includes(value)
    ? current.filter((mood) => mood !== value)
    : [...current, value];
}

function hasMoodSelection(moods: MicroLogMood[], customMood: string) {
  return moods.length > 0 || Boolean(customMood.trim());
}

interface LogFilters {
  mood: "" | MicroLogMood;
  treeId: string;
  nodeId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: LogFilters = {
  mood: "",
  treeId: "",
  nodeId: "",
  from: "",
  to: "",
};

export function MicroLogPanel({
  initialTrees,
  initialLogs,
  initialRecurringTasks,
}: MicroLogPanelProps) {
  const { locale, dictionary, t } = useLocale();
  const moodOptions = getMoodOptions(dictionary);
  const [content, setContent] = useState("");
  const [recurringTaskId, setRecurringTaskId] = useState("");
  const [moods, setMoods] = useState<MicroLogMood[]>([]);
  const [customMood, setCustomMood] = useState("");
  const [customMoodOpen, setCustomMoodOpen] = useState(false);
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [nodesByTree, setNodesByTree] = useState<Record<string, NodeDTO[]>>({});
  const [loadingTreeIds, setLoadingTreeIds] = useState<string[]>([]);
  const [trees, setTrees] = useState(initialTrees);
  const [logs, setLogs] = useState(initialLogs);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<LogFilters>(EMPTY_FILTERS);
  const [filtering, setFiltering] = useState(false);

  async function loadTreeNodes(treeId: string) {
    if (!treeId || nodesByTree[treeId] || loadingTreeIds.includes(treeId)) {
      return;
    }

    setLoadingTreeIds((current) => [...current, treeId]);
    try {
      const response = await fetch(`/api/trees/${treeId}`);
      const data = await response.json();
      if (!response.ok) {
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.log.loadTreeFailed,
          ),
        );
        return;
      }
      setNodesByTree((current) => ({ ...current, [treeId]: data.nodes }));
    } catch {
      setError(dictionary.log.loadTreeNetwork);
    } finally {
      setLoadingTreeIds((current) => current.filter((id) => id !== treeId));
    }
  }

  async function toggleTree(treeId: string) {
    const selected = selectedTreeIds.includes(treeId);
    if (selected) {
      setSelectedTreeIds((current) => current.filter((id) => id !== treeId));
      const nodeIds = new Set(
        (nodesByTree[treeId] ?? []).map((node) => node.id),
      );
      setSelectedNodeIds((current) =>
        current.filter((nodeId) => !nodeIds.has(nodeId)),
      );
      return;
    }

    setSelectedTreeIds((current) => [...current, treeId]);
    await loadTreeNodes(treeId);
  }

  function toggleNode(nodeId: string) {
    setSelectedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId],
    );
  }

  async function selectRecurringTask(taskId: string) {
    setRecurringTaskId(taskId);
    if (!taskId) return;

    const task = initialRecurringTasks.find((item) => item.id === taskId);
    if (!task) return;

    setContent(task.title);
    setSaved(false);
    setSelectedTreeIds([task.treeId]);
    setSelectedNodeIds([task.id]);
    await loadTreeNodes(task.treeId);
  }

  async function fetchFilteredLogs(nextFilters: LogFilters) {
    setFiltering(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value) params.set(key, value);
      }
      const query = params.size > 0 ? `?${params.toString()}` : "";
      const response = await fetch(`/api/micro-logs${query}`);
      const data = await response.json();
      if (!response.ok) {
        setError(
          localizeApiError(data.error, locale, dictionary.log.filterFailed),
        );
        return;
      }
      setLogs(data.logs);
    } catch {
      setError(dictionary.log.filterNetwork);
    } finally {
      setFiltering(false);
    }
  }

  async function changeFilterTree(treeId: string) {
    const next = { ...filters, treeId, nodeId: "" };
    setFilters(next);
    if (treeId) await loadTreeNodes(treeId);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    if (!hasMoodSelection(moods, customMood)) {
      setError(dictionary.log.moodRequired);
      return;
    }

    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const response = await fetch("/api/micro-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          moods,
          customMood: customMoodOpen ? customMood.trim() : "",
          treeIds: selectedTreeIds,
          nodeIds: selectedNodeIds,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          localizeApiError(data.error, locale, dictionary.log.saveFailed),
        );
        return;
      }

      setTrees((current) =>
        current.map(
          (tree) =>
            data.trees.find((updated: TreeDTO) => updated.id === tree.id) ??
            tree,
        ),
      );
      setContent("");
      setRecurringTaskId("");
      setMoods([]);
      setCustomMood("");
      setCustomMoodOpen(false);
      setSelectedTreeIds([]);
      setSelectedNodeIds([]);
      setSaved(true);
      await fetchFilteredLogs(filters);
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div className="flex flex-col gap-6">
        <section className="card-surface p-6 sm:p-8">
          <p className="text-sm font-medium text-leaf-700">
            {dictionary.log.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-forest-900 sm:text-3xl">
            {dictionary.log.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-forest-600">
            {dictionary.log.subtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            {initialRecurringTasks.length > 0 && (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-forest-800">
                  {dictionary.log.recurringLabel}
                </span>
                <select
                  value={recurringTaskId}
                  onChange={(event) => selectRecurringTask(event.target.value)}
                  className="input-field"
                >
                  <option value="">{dictionary.log.recurringPlaceholder}</option>
                  {initialRecurringTasks.map((task) => {
                    const tree = trees.find((item) => item.id === task.treeId);
                    return (
                      <option key={task.id} value={task.id}>
                        {task.title}
                        {tree ? `｜${tree.title}` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-2">
              <span className="sr-only">{dictionary.log.contentAria}</span>
              <textarea
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setSaved(false);
                }}
                rows={4}
                maxLength={300}
                autoFocus
                required
                className="input-field resize-none text-base leading-relaxed"
                placeholder={dictionary.log.contentPlaceholder}
              />
              <span className="self-end text-xs text-forest-600/60">
                {content.length}/300
              </span>
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-forest-800">
                {dictionary.log.moodLegend}
              </legend>
              <p className="mt-1 text-xs text-forest-600">
                {dictionary.log.moodHint}
              </p>
              <MoodPicker
                moods={moods}
                customMood={customMood}
                customMoodOpen={customMoodOpen}
                options={moodOptions}
                customLabel={dictionary.log.moodCustom}
                customPlaceholder={dictionary.log.moodCustomPlaceholder}
                onToggleMood={(value) =>
                  setMoods((current) => toggleMoodValue(current, value))
                }
                onCustomMoodOpenChange={setCustomMoodOpen}
                onCustomMoodChange={setCustomMood}
              />
            </fieldset>

            {trees.length > 0 && (
              <fieldset>
                <legend className="text-sm font-medium text-forest-800">
                  {dictionary.log.treeLegend}
                </legend>
                <p className="mt-1 text-xs text-forest-600">
                  {dictionary.log.treeHint}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trees.map((tree) => {
                    const selected = selectedTreeIds.includes(tree.id);
                    return (
                      <label
                        key={tree.id}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                          selected
                            ? "border-leaf-600 bg-forest-100 text-forest-900"
                            : "border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTree(tree.id)}
                          className="sr-only"
                        />
                        <span aria-hidden>{selected ? "🍃 " : "🌳 "}</span>
                        {tree.title}
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  {selectedTreeIds.map((treeId) => {
                    const tree = trees.find((item) => item.id === treeId);
                    if (!tree) return null;

                    return (
                      <TreeNodePicker
                        key={treeId}
                        tree={tree}
                        nodes={nodesByTree[treeId]}
                        loading={loadingTreeIds.includes(treeId)}
                        selectedNodeIds={selectedNodeIds}
                        onToggleNode={toggleNode}
                      />
                    );
                  })}
                </div>
              </fieldset>
            )}

            {error && (
              <p
                className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </p>
            )}

            {saved && (
              <p
                className="rounded-xl bg-forest-50 px-4 py-3 text-sm text-leaf-700"
                role="status"
              >
                {dictionary.log.saveSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !content.trim() ||
                !hasMoodSelection(moods, customMood)
              }
              className="btn-primary"
            >
              {loading
                ? dictionary.log.saving
                : selectedTreeIds.length > 0
                  ? t(dictionary.log.saveWithLeaves, {
                      count: selectedTreeIds.length,
                    })
                  : dictionary.log.savePlain}
            </button>
          </form>
        </section>
      </div>

      <LogHistory
        logs={logs}
        trees={trees}
        nodesByTree={nodesByTree}
        loadingTreeIds={loadingTreeIds}
        filters={filters}
        filterNodes={filters.treeId ? nodesByTree[filters.treeId] ?? [] : []}
        filtering={filtering}
        onLoadTreeNodes={loadTreeNodes}
        onLogUpdated={(updatedLog, updatedTrees) => {
          setLogs((current) =>
            current.map((log) =>
              log.id === updatedLog.id ? updatedLog : log,
            ),
          );
          if (updatedTrees.length > 0) {
            setTrees((current) =>
              current.map(
                (tree) =>
                  updatedTrees.find((item) => item.id === tree.id) ?? tree,
              ),
            );
          }
        }}
        onFiltersChange={setFilters}
        onTreeChange={changeFilterTree}
        onApply={() => fetchFilteredLogs(filters)}
        onClear={() => {
          setFilters(EMPTY_FILTERS);
          fetchFilteredLogs(EMPTY_FILTERS);
        }}
      />
    </div>
  );
}

function TreeNodePicker({
  tree,
  nodes,
  loading,
  selectedNodeIds,
  onToggleNode,
}: {
  tree: TreeDTO;
  nodes?: NodeDTO[];
  loading: boolean;
  selectedNodeIds: string[];
  onToggleNode: (nodeId: string) => void;
}) {
  const { dictionary, t } = useLocale();
  if (loading) {
    return (
      <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-600">
        {t(dictionary.log.expandingTree, { title: tree.title })}
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-600">
        {t(dictionary.log.treeNoNodes, { title: tree.title })}
      </div>
    );
  }

  const branches = nodes.filter((node) => node.level === 2);

  return (
    <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-4">
      <p className="text-sm font-medium text-forest-800">
        🌳 {tree.title}
      </p>
      <p className="mt-1 text-xs text-forest-600">
        {dictionary.log.pickNodesHint}
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {branches.map((branch) => {
          const tasks = nodes.filter(
            (node) => node.level === 3 && node.parentId === branch.id,
          );

          return (
            <div key={branch.id} className="rounded-lg bg-white p-3">
              <NodeCheckbox
                node={branch}
                selected={selectedNodeIds.includes(branch.id)}
                onToggle={onToggleNode}
              />

              {tasks.length > 0 && (
                <div className="mt-2 ml-6 flex flex-col gap-2 border-l border-forest-100 pl-3">
                  {tasks.map((task) => (
                    <NodeCheckbox
                      key={task.id}
                      node={task}
                      selected={selectedNodeIds.includes(task.id)}
                      onToggle={onToggleNode}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeCheckbox({
  node,
  selected,
  onToggle,
}: {
  node: NodeDTO;
  selected: boolean;
  onToggle: (nodeId: string) => void;
}) {
  const { dictionary } = useLocale();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-forest-800">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(node.id)}
        className="size-4 accent-leaf-700"
      />
      <span aria-hidden>{node.level === 2 ? "🌿" : "↳"}</span>
      <span>{node.title}</span>
      {node.fruitEarned && (
        <span title={dictionary.log.fruitEarnedTitle}>🍎</span>
      )}
    </label>
  );
}

function LogHistory({
  logs,
  trees,
  nodesByTree,
  loadingTreeIds,
  filters,
  filterNodes,
  filtering,
  onLoadTreeNodes,
  onLogUpdated,
  onFiltersChange,
  onTreeChange,
  onApply,
  onClear,
}: {
  logs: MicroLogDTO[];
  trees: TreeDTO[];
  nodesByTree: Record<string, NodeDTO[]>;
  loadingTreeIds: string[];
  filters: LogFilters;
  filterNodes: NodeDTO[];
  filtering: boolean;
  onLoadTreeNodes: (treeId: string) => Promise<void>;
  onLogUpdated: (log: MicroLogDTO, trees: TreeDTO[]) => void;
  onFiltersChange: (filters: LogFilters) => void;
  onTreeChange: (treeId: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { dictionary } = useLocale();
  return (
    <aside className="card-surface h-fit p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-medium text-forest-900">
        {dictionary.log.historyTitle}
      </h2>
      <p className="mt-1 text-xs text-forest-600">
        {dictionary.log.historyHint}
      </p>

      <LogFiltersPanel
        filters={filters}
        trees={trees}
        nodes={filterNodes}
        filtering={filtering}
        onFiltersChange={onFiltersChange}
        onTreeChange={onTreeChange}
        onApply={onApply}
        onClear={onClear}
      />

      {logs.length === 0 ? (
        <p className="mt-6 rounded-xl bg-forest-50/70 px-4 py-5 text-sm leading-relaxed text-forest-600">
          {dictionary.log.emptyHistory}
        </p>
      ) : (
        <ol className="mt-5 flex max-h-[36rem] flex-col gap-3 overflow-y-auto pr-1">
          {logs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              trees={trees}
              nodesByTree={nodesByTree}
              loadingTreeIds={loadingTreeIds}
              onLoadTreeNodes={onLoadTreeNodes}
              onUpdated={onLogUpdated}
            />
          ))}
        </ol>
      )}
    </aside>
  );
}

function LogCard({
  log,
  trees,
  nodesByTree,
  loadingTreeIds,
  onLoadTreeNodes,
  onUpdated,
}: {
  log: MicroLogDTO;
  trees: TreeDTO[];
  nodesByTree: Record<string, NodeDTO[]>;
  loadingTreeIds: string[];
  onLoadTreeNodes: (treeId: string) => Promise<void>;
  onUpdated: (log: MicroLogDTO, trees: TreeDTO[]) => void;
}) {
  const { locale, dictionary } = useLocale();
  const moodOptions = getMoodOptions(dictionary);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(log.content);
  const [moods, setMoods] = useState<MicroLogMood[]>(log.moods);
  const [customMood, setCustomMood] = useState(log.customMood ?? "");
  const [customMoodOpen, setCustomMoodOpen] = useState(
    Boolean(log.customMood),
  );
  const [selectedTreeIds, setSelectedTreeIds] = useState(log.treeIds);
  const [selectedNodeIds, setSelectedNodeIds] = useState(
    log.nodeLinks.map((link) => link.nodeId),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const treeNames = new Map(trees.map((tree) => [tree.id, tree.title]));

  async function startEditing() {
    setContent(log.content);
    setMoods(log.moods);
    setCustomMood(log.customMood ?? "");
    setCustomMoodOpen(Boolean(log.customMood));
    setSelectedTreeIds(log.treeIds);
    setSelectedNodeIds(log.nodeLinks.map((link) => link.nodeId));
    setError(null);
    setEditing(true);
    await Promise.all(log.treeIds.map((treeId) => onLoadTreeNodes(treeId)));
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
  }

  async function toggleTree(treeId: string) {
    const selected = selectedTreeIds.includes(treeId);
    if (selected) {
      setSelectedTreeIds((current) => current.filter((id) => id !== treeId));
      const nodeIds = new Set(
        (nodesByTree[treeId] ?? []).map((node) => node.id),
      );
      setSelectedNodeIds((current) =>
        current.filter((nodeId) => !nodeIds.has(nodeId)),
      );
      return;
    }

    setSelectedTreeIds((current) => [...current, treeId]);
    await onLoadTreeNodes(treeId);
  }

  function toggleNode(nodeId: string) {
    setSelectedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId],
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    if (!hasMoodSelection(moods, customMood)) {
      setError(dictionary.log.moodRequired);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/micro-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          moods,
          customMood: customMoodOpen ? customMood.trim() : "",
          treeIds: selectedTreeIds,
          nodeIds: selectedNodeIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          localizeApiError(data.error, locale, dictionary.log.updateFailed),
        );
        return;
      }

      onUpdated(data.log, data.trees ?? []);
      setEditing(false);
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-leaf-600/40 bg-white p-4">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-forest-800">
              {dictionary.log.editContent}
            </span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              maxLength={300}
              required
              className="input-field resize-none text-sm leading-relaxed"
            />
            <span className="self-end text-xs text-forest-600/60">
              {content.length}/300
            </span>
          </label>

          <fieldset>
            <legend className="text-xs font-medium text-forest-800">
              {dictionary.log.editMood}
            </legend>
            <MoodPicker
              moods={moods}
              customMood={customMood}
              customMoodOpen={customMoodOpen}
              options={moodOptions}
              customLabel={dictionary.log.moodCustom}
              customPlaceholder={dictionary.log.moodCustomPlaceholder}
              compact
              onToggleMood={(value) =>
                setMoods((current) => toggleMoodValue(current, value))
              }
              onCustomMoodOpenChange={setCustomMoodOpen}
              onCustomMoodChange={setCustomMood}
            />
          </fieldset>

          {trees.length > 0 && (
            <fieldset>
              <legend className="text-xs font-medium text-forest-800">
                {dictionary.log.editLinks}
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {trees.map((tree) => {
                  const selected = selectedTreeIds.includes(tree.id);
                  return (
                    <label
                      key={tree.id}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        selected
                          ? "border-leaf-600 bg-forest-100 text-forest-900"
                          : "border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTree(tree.id)}
                        className="sr-only"
                      />
                      <span aria-hidden>{selected ? "🍃 " : "🌳 "}</span>
                      {tree.title}
                    </label>
                  );
                })}
              </div>

              <div className="mt-2 flex flex-col gap-2">
                {selectedTreeIds.map((treeId) => {
                  const tree = trees.find((item) => item.id === treeId);
                  if (!tree) return null;
                  return (
                    <TreeNodePicker
                      key={treeId}
                      tree={tree}
                      nodes={nodesByTree[treeId]}
                      loading={loadingTreeIds.includes(treeId)}
                      selectedNodeIds={selectedNodeIds}
                      onToggleNode={toggleNode}
                    />
                  );
                })}
              </div>
            </fieldset>
          )}

          {error && (
            <p className="text-xs text-rose-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              {dictionary.common.cancel}
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !content.trim() ||
                !hasMoodSelection(moods, customMood)
              }
              className="rounded-lg bg-leaf-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-leaf-600 disabled:opacity-60"
            >
              {saving ? dictionary.common.saving : dictionary.common.save}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-forest-100/80 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-forest-900">{log.content}</p>
        <button
          type="button"
          onClick={startEditing}
          className="shrink-0 text-xs text-forest-600/70 underline-offset-4 transition-colors hover:text-leaf-700 hover:underline"
        >
          {dictionary.common.edit}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <time className="text-xs text-forest-600/70">
          {formatLoggedAt(log.loggedAt)}
        </time>
        <MoodBadges moods={log.moods} customMood={log.customMood} />
        {log.treeIds.map((treeId) => (
          <span
            key={treeId}
            className="rounded-full bg-forest-50 px-2 py-1 text-xs text-leaf-700"
          >
            🍃 {treeNames.get(treeId) ?? dictionary.log.unnamedTree}
          </span>
        ))}
        {log.nodeLinks.map((link) => (
          <span
            key={link.nodeId}
            className="rounded-full bg-surface-muted px-2 py-1 text-xs text-forest-700"
          >
            {link.nodeLevel === 2 ? "🌿" : "↳"} {link.nodeTitle}
          </span>
        ))}
      </div>
    </li>
  );
}

function LogFiltersPanel({
  filters,
  trees,
  nodes,
  filtering,
  onFiltersChange,
  onTreeChange,
  onApply,
  onClear,
}: {
  filters: LogFilters;
  trees: TreeDTO[];
  nodes: NodeDTO[];
  filtering: boolean;
  onFiltersChange: (filters: LogFilters) => void;
  onTreeChange: (treeId: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { dictionary } = useLocale();
  const moodOptions = getMoodOptions(dictionary);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <form
      className="mt-4 rounded-xl bg-forest-50/70 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-forest-800">
          {dictionary.log.filterTitle}
        </h3>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            disabled={filtering}
            className="text-xs text-forest-600 underline-offset-4 hover:underline"
          >
            {dictionary.log.clearFilters}
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">
            {dictionary.log.filterMood}
          </span>
          <select
            value={filters.mood}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                mood: event.target.value as LogFilters["mood"],
              })
            }
            className="input-field py-2 text-sm"
          >
            <option value="">{dictionary.log.allMoods}</option>
            {moodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">
            {dictionary.log.filterTree}
          </span>
          <select
            value={filters.treeId}
            onChange={(event) => onTreeChange(event.target.value)}
            className="input-field py-2 text-sm"
          >
            <option value="">{dictionary.log.allTrees}</option>
            {trees.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">
            {dictionary.log.filterNode}
          </span>
          <select
            value={filters.nodeId}
            disabled={!filters.treeId}
            onChange={(event) =>
              onFiltersChange({ ...filters, nodeId: event.target.value })
            }
            className="input-field py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{dictionary.log.allNodes}</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.level === 2 ? "🌿 " : "　↳ "}
                {node.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-forest-600">
              {dictionary.log.dateFrom}
            </span>
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) =>
                onFiltersChange({ ...filters, from: event.target.value })
              }
              className="input-field min-w-0 py-2 text-xs"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-forest-600">
              {dictionary.log.dateTo}
            </span>
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) =>
                onFiltersChange({ ...filters, to: event.target.value })
              }
              className="input-field min-w-0 py-2 text-xs"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={filtering}
        className="mt-3 w-full rounded-lg bg-leaf-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-leaf-600 disabled:opacity-60"
      >
        {filtering ? dictionary.log.applying : dictionary.log.applyFilters}
      </button>
    </form>
  );
}

function MoodPicker({
  moods,
  customMood,
  customMoodOpen,
  options,
  customLabel,
  customPlaceholder,
  compact = false,
  onToggleMood,
  onCustomMoodOpenChange,
  onCustomMoodChange,
}: {
  moods: MicroLogMood[];
  customMood: string;
  customMoodOpen: boolean;
  options: { value: MicroLogMood; emoji: string; label: string }[];
  customLabel: string;
  customPlaceholder: string;
  compact?: boolean;
  onToggleMood: (value: MicroLogMood) => void;
  onCustomMoodOpenChange: (open: boolean) => void;
  onCustomMoodChange: (value: string) => void;
}) {
  const chipClass = compact
    ? "cursor-pointer rounded-full border px-2.5 py-1.5 text-xs transition-colors"
    : "cursor-pointer rounded-full border px-3 py-2 text-sm transition-colors";

  return (
    <div className={compact ? "mt-2 flex flex-col gap-2" : "mt-3 flex flex-col gap-2"}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = moods.includes(option.value);
          return (
            <label
              key={option.value}
              className={`${chipClass} ${
                selected
                  ? "border-leaf-600 bg-forest-100 text-forest-900"
                  : "border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleMood(option.value)}
                className="sr-only"
              />
              <span aria-hidden>{option.emoji} </span>
              {option.label}
            </label>
          );
        })}
        <label
          className={`${chipClass} ${
            customMoodOpen
              ? "border-leaf-600 bg-forest-100 text-forest-900"
              : "border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
          }`}
        >
          <input
            type="checkbox"
            checked={customMoodOpen}
            onChange={(event) => {
              const open = event.target.checked;
              onCustomMoodOpenChange(open);
              if (!open) onCustomMoodChange("");
            }}
            className="sr-only"
          />
          {customLabel}
        </label>
      </div>
      {customMoodOpen && (
        <input
          type="text"
          value={customMood}
          onChange={(event) => onCustomMoodChange(event.target.value)}
          maxLength={40}
          className={`input-field ${compact ? "py-2 text-sm" : ""}`}
          placeholder={customPlaceholder}
        />
      )}
    </div>
  );
}

function MoodBadges({
  moods,
  customMood,
}: {
  moods: MicroLogMood[];
  customMood?: string;
}) {
  const { dictionary } = useLocale();
  const moodOptions = getMoodOptions(dictionary);

  return (
    <>
      {moods.map((mood) => {
        const option =
          moodOptions.find((item) => item.value === mood) ?? moodOptions[0];
        return (
          <span
            key={mood}
            className="rounded-full bg-forest-50 px-2 py-1 text-xs text-forest-700"
            title={dictionary.log.moodBadgeTitle}
          >
            {option.emoji} {option.label}
          </span>
        );
      })}
      {customMood && (
        <span
          className="rounded-full bg-forest-50 px-2 py-1 text-xs text-forest-700"
          title={dictionary.log.moodBadgeTitle}
        >
          {customMood}
        </span>
      )}
    </>
  );
}

function formatLoggedAt(value: string) {
  // 固定用 UTC+8 做純數字格式化，避免 Node 與瀏覽器的 Intl 輸出差異
  // 造成 hydration mismatch。後續可再依使用者 timezone 由伺服器預先格式化。
  const taipeiTime = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const month = taipeiTime.getUTCMonth() + 1;
  const day = taipeiTime.getUTCDate();
  const hours = String(taipeiTime.getUTCHours()).padStart(2, "0");
  const minutes = String(taipeiTime.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}
