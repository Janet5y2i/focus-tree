export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="card-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-forest-900 sm:text-3xl">
          歡迎回來
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-forest-600">
          這裡是你的成長森林。接下來我們會在這裡渲染目標樹、Micro-Log
          輸入，以及 AI 成長回顧。現在先確認登入與帳號系統已就緒。
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "目標樹",
            desc: "最多三層：樹幹 → 子目標 → 任務。完成任務會結出果實。",
          },
          {
            title: "Micro-Log",
            desc: "記錄剛剛完成了什麼，哪怕只是喝了一杯水。",
          },
          {
            title: "無焦慮回顧",
            desc: "只看你已經累積的成長，絕不顯示未完成事項。",
          },
        ].map((item) => (
          <article key={item.title} className="card-surface p-5">
            <h2 className="text-lg font-medium text-forest-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-forest-600">
              {item.desc}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
