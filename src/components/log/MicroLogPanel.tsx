"use client";

import { FormEvent, useState } from "react";
import type { MicroLogDTO } from "@/lib/types/micro-log";
import type { TreeDTO } from "@/lib/types/tree";

interface MicroLogPanelProps {
  initialTrees: TreeDTO[];
  initialLogs: MicroLogDTO[];
}

export function MicroLogPanel({
  initialTrees,
  initialLogs,
}: MicroLogPanelProps) {
  const [content, setContent] = useState("");
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([]);
  const [trees, setTrees] = useState(initialTrees);
  const [logs, setLogs] = useState(initialLogs);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleTree(treeId: string) {
    setSelectedTreeIds((current) =>
      current.includes(treeId)
        ? current.filter((id) => id !== treeId)
        : [...current, treeId],
    );
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
        body: JSON.stringify({ content, treeIds: selectedTreeIds }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "儲存失敗，請稍後再試");
        return;
      }

      setLogs((current) => [data.log, ...current].slice(0, 50));
      setTrees((current) =>
        current.map(
          (tree) =>
            data.trees.find((updated: TreeDTO) => updated.id === tree.id) ??
            tree,
        ),
      );
      setContent("");
      setSelectedTreeIds([]);
      setSaved(true);
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

      <LogHistory logs={logs} trees={trees} />
    </div>
  );
}

function LogHistory({
  logs,
  trees,
}: {
  logs: MicroLogDTO[];
  trees: TreeDTO[];
}) {
  const treeNames = new Map(trees.map((tree) => [tree.id, tree.title]));

  return (
    <aside className="card-surface h-fit p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-medium text-forest-900">已經走過的腳步</h2>
      <p className="mt-1 text-xs text-forest-600">
        這裡只收藏你完成的事，不計算還沒做的事。
      </p>

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
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function formatLoggedAt(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
