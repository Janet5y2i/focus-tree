import type { Locale } from "@/i18n/config";
import type { ReviewPeriod, ReviewStats } from "@/lib/types/review";

interface SummaryResult {
  summary: string;
  generatedBy: "ai" | "reflection";
}

const AI_TIMEOUT_MS = 12_000;

/**
 * 產生溫暖、鼓勵的成長回顧總結。
 *
 * 若設定了 OPENAI_API_KEY 就呼叫 LLM；否則（或呼叫失敗時）
 * 退回本地生成的溫暖總結，確保功能永遠可用、且永不阻塞使用者。
 */
export async function generateReviewSummary(
  displayName: string,
  period: ReviewPeriod,
  stats: ReviewStats,
  locale: Locale = "zh-TW",
): Promise<SummaryResult> {
  const aiSummary = await tryOpenAISummary(displayName, period, stats, locale);
  if (aiSummary) {
    return { summary: aiSummary, generatedBy: "ai" };
  }
  return {
    summary: buildReflection(displayName, period, stats, locale),
    generatedBy: "reflection",
  };
}

const SYSTEM_PROMPTS: Record<Locale, string> = {
  "zh-TW": `你是一個心靈成長 App「Focus Tree」的溫柔陪伴者。
你的任務是為使用者總結他們這段期間累積的微小實踐，語氣要溫暖、真誠、具體、鼓勵。

嚴格鐵律（違反即失敗）：
- 絕對不要提到任何「未完成、還沒做、逾期、進度落後、應該要、下次要更努力」之類的內容。
- 不要催促、不要設定期待、不要給待辦建議。
- 只聚焦於「使用者已經做到了什麼」，讓他感到被看見。
- 用第二人稱「你」，繁體中文，2 到 3 段短文，總長度約 120-200 字。
- 可以自然地用「葉子、果實、樹、成長」等意象，但不要濫用。`,
  en: `You are a gentle companion in the personal-growth app “Focus Tree.”
Summarize the small practices the user accumulated during this period in a warm, sincere, specific, and encouraging voice.

Strict rules:
- Never mention anything unfinished, not done, overdue, behind schedule, expected, or needing more effort.
- Do not push, set expectations, give advice, or suggest to-dos.
- Focus only on what the user has already done so they feel seen.
- Address the user as “you.” Write 2–3 short paragraphs in English, about 100–160 words total.
- You may naturally use images of leaves, fruit, trees, and growth, but do not overuse them.`,
};

const PERIOD_LABELS: Record<Locale, Record<ReviewPeriod, string>> = {
  "zh-TW": {
    weekly: "這一週",
    biweekly: "這兩週",
    monthly: "這個月",
    custom: "這段時間",
  },
  en: {
    weekly: "this week",
    biweekly: "these two weeks",
    monthly: "this month",
    custom: "this period",
  },
};

async function tryOpenAISummary(
  displayName: string,
  period: ReviewPeriod,
  stats: ReviewStats,
  locale: Locale,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[locale] },
          {
            role: "user",
            content: buildUserPrompt(displayName, period, stats, locale),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[ai/review] OpenAI responded", response.status);
      return null;
    }

    const data = await response.json();
    const text: unknown = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) return null;

    return text.trim();
  } catch (error) {
    console.error("[ai/review] summary failed, using reflection", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildUserPrompt(
  displayName: string,
  period: ReviewPeriod,
  stats: ReviewStats,
  locale: Locale,
): string {
  if (locale === "en") {
    const highlights =
      stats.highlights.length > 0
        ? stats.highlights.map((highlight) => `- ${highlight}`).join("\n")
        : "(There are no written logs for this period, but every moment still counts.)";

    return `User name: ${displayName}
Review period: ${PERIOD_LABELS.en[period]}
Small practices logged during this period: ${stats.logCount}
Leaves grown (practices related to goals): ${stats.leafCount}
Fruit borne (completed tasks): ${stats.fruitCount}
Goal trees nurtured: ${stats.treesNurtured}
Days with logs: ${stats.activeDays}
${stats.topTree ? `Most nurtured tree: “${stats.topTree.title}” (${stats.topTree.leaves} leaves)` : ""}

Some completed practices:
${highlights}

Write a warm growth reflection based on this information.`;
  }

  const highlights =
    stats.highlights.length > 0
      ? stats.highlights.map((h) => `- ${h}`).join("\n")
      : "（這段期間沒有文字記錄，但每個當下都算數）";

  return `使用者名稱：${displayName}
回顧期間：${PERIOD_LABELS["zh-TW"][period]}
這段期間的微小實踐紀錄數：${stats.logCount}
長出的葉子（與目標相關的實踐）：${stats.leafCount}
結出的果實（完成的任務）：${stats.fruitCount}
照顧到的目標樹數：${stats.treesNurtured}
有記錄的天數：${stats.activeDays}
${stats.topTree ? `最常灌溉的樹：「${stats.topTree.title}」（${stats.topTree.leaves} 片葉子）` : ""}

部分實踐內容：
${highlights}

請根據以上資訊，寫一段溫暖的成長回顧。`;
}

function buildReflection(
  displayName: string,
  period: ReviewPeriod,
  stats: ReviewStats,
  locale: Locale,
): string {
  const label = PERIOD_LABELS[locale][period];

  if (locale === "en") {
    const name = displayName.trim() || "You";

    if (stats.logCount === 0) {
      return `${name}, you may not have left many written notes ${label}, but that doesn’t mean nothing happened.\n\nResting, breathing, and simply making it through are forms of movement too. This forest will be here whenever you want to return, ready to hold a new leaf.`;
    }

    const parts = [
      `${name}, ${label} you quietly gathered ${stats.logCount} completed ${stats.logCount === 1 ? "practice" : "practices"}. These small moments are real signs that you have been showing up for yourself.`,
    ];
    const growth: string[] = [];
    if (stats.leafCount > 0)
      growth.push(`${stats.leafCount} new ${stats.leafCount === 1 ? "leaf" : "leaves"}`);
    if (stats.fruitCount > 0)
      growth.push(`${stats.fruitCount} ${stats.fruitCount === 1 ? "fruit" : "fruits"}`);
    if (stats.treesNurtured > 0)
      growth.push(
        `${stats.treesNurtured} ${stats.treesNurtured === 1 ? "tree" : "trees"} gently nurtured`,
      );

    if (growth.length > 0) {
      let sentence = `Without fanfare, your forest grew: ${growth.join(", ")}`;
      if (stats.topTree) {
        sentence += `, with “${stats.topTree.title}” especially flourishing under your care`;
      }
      parts.push(`${sentence}.`);
    }

    parts.push(
      stats.activeDays > 1
        ? `You returned to the present on ${stats.activeDays} different days. That steady kindness matters. Be proud of who you are right now.`
        : "Every step counts. Be proud of who you are right now.",
    );

    return parts.join("\n\n");
  }

  const name = displayName.trim() || "你";

  if (stats.logCount === 0) {
    return `${name}，${label}也許你沒有留下太多文字，但這並不代表什麼都沒發生。\n\n休息、喘息、只是好好活著，本身就是一種前進。這棵森林會一直在這裡，等你想回來的時候，隨時都可以種下新的一片葉子。`;
  }

  const parts: string[] = [];

  parts.push(
    `${name}，${label}你悄悄地累積了 ${stats.logCount} 個當下的實踐。這些看似微小的瞬間，其實都是你正在靠近自己的證明。`,
  );

  const growth: string[] = [];
  if (stats.leafCount > 0) growth.push(`長出了 ${stats.leafCount} 片新葉`);
  if (stats.fruitCount > 0) growth.push(`結出了 ${stats.fruitCount} 顆果實`);
  if (stats.treesNurtured > 0)
    growth.push(`細心照顧了 ${stats.treesNurtured} 棵樹`);

  if (growth.length > 0) {
    let sentence = `不知不覺間，你的森林${growth.join("、")}`;
    if (stats.topTree) {
      sentence += `，其中「${stats.topTree.title}」在你的灌溉下特別茂盛`;
    }
    parts.push(sentence + "。");
  }

  if (stats.activeDays > 1) {
    parts.push(
      `你在 ${stats.activeDays} 個不同的日子裡回到當下——這份細水長流的溫柔，比任何一次的用力衝刺都更珍貴。為現在的自己感到驕傲吧。`,
    );
  } else {
    parts.push("每一步都算數。為現在的自己感到驕傲吧。");
  }

  return parts.join("\n\n");
}
