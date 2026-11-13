"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

// Shown when a page crashes, instead of a blank screen.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neg-soft text-neg">
        <TriangleAlert size={22} />
      </span>
      <div>
        <p className="text-lg font-bold text-ink">حدث خطأ غير متوقّع</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">بياناتكم بأمان. أعد المحاولة، وإن تكرّر الخطأ أعد تحميل الصفحة.</p>
      </div>
      <button onClick={reset} className="tap inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90 md:h-9 md:text-[13px]">
        <RotateCw size={16} /> إعادة المحاولة
      </button>
    </div>
  );
}
