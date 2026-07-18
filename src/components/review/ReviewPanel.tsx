"use client";

import { useState } from "react";
import type { ReviewPeriod, ReviewResponse } from "@/lib/types/review";

interface ReviewPanelProps {
  initialReview: ReviewResponse;
}

const PERIOD_OPTIONS: { value: ReviewPeriod; label: string }[] = [
  { value: "weekly", label: "這一週" },
  { value: "biweekly", label: "這兩週" },
  { value: "monthly", label: "這個月" },
];

export function ReviewPanel({ initialReview }: ReviewPanelProps) {
  const [review, setReview] = useState(initialReview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectPeriod(period: ReviewPeriod) {
    if (period === review.period || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/review?period=${period}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "無法生成回顧，請稍後再試");
        return;
      }
      setReview(data);
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  const { stats, summary } = review;

  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-leaf-700">成長回顧</p>
            <h1 className="mt-2 text-2xl font-semibold text-forest-900 sm:text-3xl">
              你不知不覺，走了這麼遠
            </h1>
          </div>

          <div
            role="tablist"
            aria-label="回顧期間"
            className="flex gap-1 self-start rounded-full bg-forest-50 p-1"
          >
            {PERIOD_OPTIONS.map((option) => {
              const active = option.value === review.period;
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
        <StatCard emoji="🍃" label="長出的葉子" value={stats.leafCount} />
        <StatCard emoji="🍎" label="結出的果實" value={stats.fruitCount} />
        <StatCard emoji="📝" label="當下的實踐" value={stats.logCount} />
        <StatCard emoji="🌤️" label="有你的日子" value={stats.activeDays} />
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
            寫給你的一段話
          </h2>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-base leading-relaxed text-forest-800">
          {summary.split("\n").map((paragraph, index) =>
            paragraph.trim() ? <p key={index}>{paragraph}</p> : null,
          )}
        </div>

        {stats.topTree && (
          <p className="mt-6 rounded-xl bg-forest-50/70 px-4 py-3 text-sm text-forest-700">
            這段期間你最常灌溉「{stats.topTree.title}」，為它添了{" "}
            {stats.topTree.leaves} 片葉子。🍃
          </p>
        )}
      </section>

      {stats.highlights.length > 0 && (
        <section className="card-surface p-6 sm:p-8">
          <h2 className="text-lg font-medium text-forest-900">
            那些你完成的瞬間
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {stats.highlights.map((highlight, index) => (
              <li
                key={index}
                className="rounded-xl border border-forest-100/80 bg-white px-4 py-3 text-sm text-forest-800"
              >
                🍃 {highlight}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
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
