"use client";

import { useState } from "react";
import { localizeApiError } from "@/i18n/api-errors";
import { useLocale } from "@/i18n/locale-context";
import type { ReviewPeriod, ReviewResponse } from "@/lib/types/review";

interface ReviewPanelProps {
  initialReview: ReviewResponse;
}

export function ReviewPanel({ initialReview }: ReviewPanelProps) {
  const { locale, dictionary, t } = useLocale();
  const periodOptions: { value: ReviewPeriod; label: string }[] = [
    { value: "weekly", label: dictionary.review.weekly },
    { value: "biweekly", label: dictionary.review.biweekly },
    { value: "monthly", label: dictionary.review.monthly },
    { value: "custom", label: dictionary.review.custom },
  ];
  const [review, setReview] = useState(initialReview);
  const [selectedPeriod, setSelectedPeriod] = useState<ReviewPeriod>(
    initialReview.period,
  );
  const [customFrom, setCustomFrom] = useState(
    initialReview.stats.from.slice(0, 10),
  );
  const [customTo, setCustomTo] = useState(
    initialReview.stats.to.slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectPeriod(period: ReviewPeriod) {
    if (loading) return;
    setSelectedPeriod(period);
    if (period === "custom" || period === review.period) return;

    await loadReview(`/api/review?period=${period}`);
  }

  async function loadReview(url: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.review.generateFailed,
          ),
        );
        return;
      }
      setReview(data);
      setSelectedPeriod(data.period);
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function applyCustomRange() {
    if (!customFrom || !customTo) {
      setError(dictionary.review.needDates);
      return;
    }
    if (customFrom > customTo) {
      setError(dictionary.review.invalidRange);
      return;
    }

    const params = new URLSearchParams({
      period: "custom",
      from: customFrom,
      to: customTo,
    });
    await loadReview(`/api/review?${params.toString()}`);
  }

  const { stats, summary } = review;

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-leaf-700">
              {dictionary.review.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-forest-900 sm:text-3xl">
              {dictionary.review.title}
            </h1>
          </div>

          <div
            role="tablist"
            aria-label={dictionary.review.periodAria}
            className="flex flex-wrap gap-1 self-start rounded-2xl bg-forest-50 p-1"
          >
            {periodOptions.map((option) => {
              const active = option.value === selectedPeriod;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={loading}
                  onClick={() => selectPeriod(option.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    active
                      ? "bg-white text-forest-900 shadow-sm"
                      : "text-forest-600 hover:text-forest-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {selectedPeriod === "custom" && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-forest-50/70 p-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-forest-600">
                {dictionary.review.dateFrom}
              </span>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="input-field py-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-forest-600">
                {dictionary.review.dateTo}
              </span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(event) => setCustomTo(event.target.value)}
                className="input-field py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={loading || !customFrom || !customTo}
              className="rounded-xl bg-leaf-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-leaf-600 disabled:opacity-60"
            >
              {loading
                ? dictionary.review.reviewing
                : dictionary.review.applyCustom}
            </button>
          </div>
        )}

        {error && (
          <p
            className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          emoji="🍃"
          label={dictionary.review.leafStat}
          value={stats.leafCount}
        />
        <StatCard
          emoji="🍎"
          label={dictionary.review.fruitStat}
          value={stats.fruitCount}
        />
        <StatCard
          emoji="📝"
          label={dictionary.review.logStat}
          value={stats.logCount}
        />
        <StatCard
          emoji="🌤️"
          label={dictionary.review.dayStat}
          value={stats.activeDays}
        />
      </section>

      <section
        className={`card-surface p-6 transition-opacity sm:p-8 ${
          loading ? "opacity-50" : "opacity-100"
        }`}
        aria-busy={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🌳
          </span>
          <h2 className="text-lg font-medium text-forest-900">
            {dictionary.review.letterTitle}
          </h2>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-base leading-relaxed text-forest-800">
          {summary.split("\n").map((paragraph, index) =>
            paragraph.trim() ? <p key={index}>{paragraph}</p> : null,
          )}
        </div>

        {stats.topTree && (
          <p className="mt-6 rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-700">
            {t(dictionary.review.topTree, {
              title: stats.topTree.title,
              leaves: stats.topTree.leaves,
            })}
          </p>
        )}
      </section>

      {stats.highlights.length > 0 && (
        <section className="card-surface p-6 sm:p-8">
          <h2 className="text-lg font-medium text-forest-900">
            {dictionary.review.highlightsTitle}
          </h2>
          <ul className="mt-4 flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
            {stats.highlights.map((highlight) => (
              <li
                key={`${highlight.loggedAt}-${highlight.content.slice(0, 24)}`}
                className="rounded-xl border border-forest-100/80 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-forest-800">
                    🍃 {highlight.content}
                  </p>
                  <time className="shrink-0 text-xs text-forest-600/70">
                    {formatLoggedAt(highlight.loggedAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatLoggedAt(value: string) {
  // 固定用 UTC+8 做純數字格式化，避免 Node 與瀏覽器的 Intl 輸出差異。
  const taipeiTime = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const month = taipeiTime.getUTCMonth() + 1;
  const day = taipeiTime.getUTCDate();
  const hours = String(taipeiTime.getUTCHours()).padStart(2, "0");
  const minutes = String(taipeiTime.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-1 p-5 text-center">
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-2xl font-semibold text-forest-900">{value}</span>
      <span className="text-sm text-forest-600">{label}</span>
    </div>
  );
}
