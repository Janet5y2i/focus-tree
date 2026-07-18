import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl" aria-hidden>
              🌳
            </span>
            <span className="text-2xl font-semibold text-forest-900">
              Focus Tree
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-forest-600">
            專注於你已經完成的，讓成長自然發生。
          </p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          <h1 className="mb-6 text-xl font-semibold text-forest-900">登入</h1>
          <AuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
