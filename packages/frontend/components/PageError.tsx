import Link from "next/link";
import type { ErrorKind } from "@/lib/errors";

type PageErrorProps = {
  kind: ErrorKind;
  onRetry?: () => void;
};

export function PageError({ kind, onRetry }: PageErrorProps) {
  if (kind === "auth") {
    return (
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-200">認証が必要です</p>
        <p className="mt-1 text-sm text-slate-400">
          このページを表示するにはログインが必要です。
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded border border-rose-300/40 bg-rose-300/10 px-3 py-1.5 text-sm text-rose-100 transition hover:bg-rose-300/20"
        >
          ログインページへ
        </Link>
      </div>
    );
  }

  const message =
    kind === "server"
      ? "サーバーエラーが発生しました。しばらくしてから再試行してください。"
      : "データの読み込みに失敗しました。ネットワーク接続を確認してください。";

  return (
    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-5 py-4">
      <p className="text-sm font-semibold text-rose-200">エラーが発生しました</p>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-sm text-cyan-100 transition hover:bg-cyan-300/20"
        >
          再試行
        </button>
      ) : null}
    </div>
  );
}
