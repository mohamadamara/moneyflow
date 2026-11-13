import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="tnum text-5xl font-bold tracking-tight text-faint">404</p>
      <div>
        <p className="text-lg font-bold text-ink">الصفحة غير موجودة</p>
        <p className="mt-1 text-sm text-muted">ربما تغيّر الرابط أو حُذفت الصفحة.</p>
      </div>
      <Link href="/" className="tap inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:opacity-90 md:h-9 md:text-[13px]">
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
