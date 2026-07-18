"use client";

import { FormEvent, useState } from "react";
import type { MicroLogDTO, MicroLogMood } from "@/lib/types/micro-log";
import type { NodeDTO, TreeDTO } from "@/lib/types/tree";

interface MicroLogPanelProps {
  initialTrees: TreeDTO[];
  initialLogs: MicroLogDTO[];
}

const MOOD_OPTIONS: {
  value: MicroLogMood;
  emoji: string;
  label: string;
}[] = [
  { value: "neutral", emoji: "🌿", label: "平常" },
  { value: "calm", emoji: "😌", label: "平靜" },
  { value: "grateful", emoji: "🙏", label: "感謝" },
  { value: "focused", emoji: "🎯", label: "專注" },
  { value: "joyful", emoji: "😊", label: "開心" },
  { value: "tired", emoji: "😮‍💨", label: "疲憊" },
  { value: "anxious", emoji: "🌧️", label: "焦慮" },
];

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
}: MicroLogPanelProps) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<MicroLogMood>("neutral");
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
        setError(data.error ?? "無法載入這棵樹的細節");
        return;
      }
      setNodesByTree((current) => ({ ...current, [treeId]: data.nodes }));
    } catch {
      setError("網路連線失敗，無法載入目標細節");
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
        setError(data.error ?? "無法篩選記錄");
        return;
      }
      setLogs(data.logs);
    } catch {
      setError("網路連線失敗，無法篩選記錄");
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

    setError(null);
    setSaved(false);
    setLoading(true);

    try {
      const response = await fetch("/api/micro-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mood,
          treeIds: selectedTreeIds,
          nodeIds: selectedNodeIds,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "儲存失敗，請稍後再試");
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
      setMood("neutral");
      setSelectedTreeIds([]);
      setSelectedNodeIds([]);
      setSaved(true);
      await fetchFilteredLogs(filters);
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div className="flex flex-col gap-6">
        <section className="card-surface p-6 sm:p-8">
          <p className="text-sm font-medium text-leaf-700">回到當下</p>
          <h1 className="mt-2 text-2xl font-semibold text-forest-900 sm:text-3xl">
            剛剛完成了什麼？
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-forest-600">
            再微小都值得記下。喝一杯水、深呼吸一次，也都是你照顧自己的證明。
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="sr-only">剛剛完成的事</span>
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
                placeholder="例如：我剛剛起身伸展了一下"
              />
              <span className="self-end text-xs text-forest-600/60">
                {content.length}/300
              </span>
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-forest-800">
                此刻的心情是什麼？
              </legend>
              <p className="mt-1 text-xs text-forest-600">
                沒有好壞，只是溫柔地看見現在的自己。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((option) => {
                  const selected = mood === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-full border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? "border-leaf-600 bg-forest-100 text-forest-900"
                          : "border-forest-100 bg-white text-forest-700 hover:bg-forest-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mood"
                        value={option.value}
                        checked={selected}
                        onChange={() => setMood(option.value)}
                        className="sr-only"
                      />
                      <span aria-hidden>{option.emoji} </span>
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {trees.length > 0 && (
              <fieldset>
                <legend className="text-sm font-medium text-forest-800">
                  這和哪些目標樹有一點關係？
                </legend>
                <p className="mt-1 text-xs text-forest-600">
                  自由勾選，也可以不連結任何樹。
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
                記下來了。這一步已經真實發生。🍃
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="btn-primary"
            >
              {loading
                ? "記錄中…"
                : selectedTreeIds.length > 0
                  ? `記下來，長出 ${selectedTreeIds.length} 片葉子`
                  : "記下這一刻"}
            </button>
          </form>
        </section>

        {trees.length > 0 && (
          <section className="card-surface p-6">
            <h2 className="font-medium text-forest-900">正在長大的樹</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {trees.map((tree) => (
                <div
                  key={tree.id}
                  className="flex items-center justify-between rounded-xl bg-forest-50/70 px-4 py-3"
                >
                  <span className="truncate text-sm text-forest-800">
                    🌳 {tree.title}
                  </span>
                  <span
                    className="ml-3 shrink-0 text-sm text-leaf-700"
                    title="累積的微小實踐"
                  >
                    🍃 {tree.stats.leafCount}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <LogHistory
        logs={logs}
        trees={trees}
        filters={filters}
        filterNodes={filters.treeId ? nodesByTree[filters.treeId] ?? [] : []}
        filtering={filtering}
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
  if (loading) {
    return (
      <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-600">
        正在展開「{tree.title}」的樹枝…
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-600">
        「{tree.title}」目前沒有子目標，這筆記錄會連結到整棵樹。
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
        可再勾選更明確的子目標或任務（選填）。
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
      {node.fruitEarned && <span title="這個任務已結過果實">🍎</span>}
    </label>
  );
}

function LogHistory({
  logs,
  trees,
  filters,
  filterNodes,
  filtering,
  onFiltersChange,
  onTreeChange,
  onApply,
  onClear,
}: {
  logs: MicroLogDTO[];
  trees: TreeDTO[];
  filters: LogFilters;
  filterNodes: NodeDTO[];
  filtering: boolean;
  onFiltersChange: (filters: LogFilters) => void;
  onTreeChange: (treeId: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const treeNames = new Map(trees.map((tree) => [tree.id, tree.title]));

  return (
    <aside className="card-surface h-fit p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-medium text-forest-900">已經走過的腳步</h2>
      <p className="mt-1 text-xs text-forest-600">
        這裡只收藏你完成的事，不計算還沒做的事。
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
          第一筆記錄正在等你。不需要是大事，只要是真實發生的一小步。
        </p>
      ) : (
        <ol className="mt-5 flex max-h-[36rem] flex-col gap-3 overflow-y-auto pr-1">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-forest-100/80 bg-white p-4"
            >
              <p className="text-sm leading-relaxed text-forest-900">
                {log.content}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <MoodBadge mood={log.mood} />
                <time className="text-xs text-forest-600/70">
                  {formatLoggedAt(log.loggedAt)}
                </time>
                {log.treeIds.map((treeId) => (
                  <span
                    key={treeId}
                    className="rounded-full bg-forest-50 px-2 py-1 text-xs text-leaf-700"
                  >
                    🍃 {treeNames.get(treeId) ?? "一棵成長樹"}
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
          ))}
        </ol>
      )}
    </aside>
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
        <h3 className="text-sm font-medium text-forest-800">篩選記錄</h3>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            disabled={filtering}
            className="text-xs text-forest-600 underline-offset-4 hover:underline"
          >
            清除
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">心情</span>
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
            <option value="">全部心情</option>
            {MOOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">主目標</span>
          <select
            value={filters.treeId}
            onChange={(event) => onTreeChange(event.target.value)}
            className="input-field py-2 text-sm"
          >
            <option value="">全部目標樹</option>
            {trees.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-forest-600">子目標／任務</span>
          <select
            value={filters.nodeId}
            disabled={!filters.treeId}
            onChange={(event) =>
              onFiltersChange({ ...filters, nodeId: event.target.value })
            }
            className="input-field py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">全部子目標與任務</option>
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
            <span className="text-xs text-forest-600">開始日期</span>
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
            <span className="text-xs text-forest-600">結束日期</span>
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
        {filtering ? "篩選中…" : "套用篩選"}
      </button>
    </form>
  );
}

function MoodBadge({ mood }: { mood: MicroLogMood }) {
  const option =
    MOOD_OPTIONS.find((item) => item.value === mood) ?? MOOD_OPTIONS[0];

  return (
    <span
      className="rounded-full bg-forest-50 px-2 py-1 text-xs text-forest-700"
      title="記錄當下的心情"
    >
      {option.emoji} {option.label}
    </span>
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
