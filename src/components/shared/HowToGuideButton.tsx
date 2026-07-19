"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/locale-context";

export function HowToGuideButton() {
  const { dictionary } = useLocale();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-forest-100 bg-white px-2.5 py-1.5 text-xs font-medium text-forest-800 transition-colors hover:bg-forest-50 sm:text-sm"
      >
        {dictionary.guide.button}
      </button>

      {/* header 的 backdrop-blur 會讓 fixed 元素相對 header 定位，
          用 portal 掛到 body 才能真正固定在畫面中央。 */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/35 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={() => setOpen(false)}
          >
          <div
            className="flex max-h-[min(40rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-forest-100/80 px-6 py-4">
              <h2
                id={titleId}
                className="text-lg font-semibold text-forest-900"
              >
                {dictionary.guide.title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-forest-600 underline-offset-4 hover:text-forest-900 hover:underline"
              >
                {dictionary.common.cancel}
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <GuideSection title={dictionary.guide.treesSection}>
                <GuideItem
                  title={dictionary.guide.treesPlantTitle}
                  body={dictionary.guide.treesPlantBody}
                />
                <GuideItem
                  title={dictionary.guide.treesExpandTitle}
                  body={dictionary.guide.treesExpandBody}
                />
                <GuideItem
                  title={dictionary.guide.treesTaskTitle}
                  body={dictionary.guide.treesTaskBody}
                />
                <GuideItem
                  title={dictionary.guide.treesRecurringTitle}
                  body={dictionary.guide.treesRecurringBody}
                />
              </GuideSection>

              <GuideSection title={dictionary.guide.logSection}>
                <p className="text-sm leading-relaxed text-forest-700">
                  {dictionary.guide.logIntro}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-forest-700">
                  {dictionary.guide.logHowTo}
                </p>
                <GuideItem
                  title={dictionary.guide.logHistoryTitle}
                  body={dictionary.guide.logHistoryBody}
                />
              </GuideSection>

              <GuideSection title={dictionary.guide.reviewSection} last>
                <p className="text-sm leading-relaxed text-forest-700">
                  {dictionary.guide.reviewBody}
                </p>
              </GuideSection>
            </div>

            <div className="border-t border-forest-100/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                {dictionary.guide.close}
              </button>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function GuideSection({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-6"}>
      <h3 className="text-sm font-semibold tracking-wide text-leaf-700">
        {title}
      </h3>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function GuideItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-forest-50/70 px-4 py-3">
      <p className="text-sm font-medium text-forest-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-forest-700">{body}</p>
    </div>
  );
}
