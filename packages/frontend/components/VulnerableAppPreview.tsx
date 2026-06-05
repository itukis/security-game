import type { Challenge } from "@/lib/challengeTypes";

export function VulnerableAppPreview({ challenge }: { challenge: Challenge }) {
  const kind = challenge.previewKind ?? "login";

  return (
    <div className="rounded-lg border border-cyan-300/20 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Preview
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            {challenge.vulnerableAppTitle}
          </h3>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {challenge.targetEndpoint}
          </p>
        </div>
        <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.85)]" />
      </div>

      {kind === "login" ? <LoginPreview /> : null}
      {kind === "comments" ? <CommentsPreview /> : null}
      {kind === "profile" ? <ProfilePreview /> : null}

      <div className="mt-4 rounded border border-rose-300/20 bg-rose-300/10 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-100">
          Test Payload
        </p>
        <p className="mt-2 break-all font-mono text-sm text-rose-100">
          {challenge.attackPayload}
        </p>
      </div>

      <div className="mt-4 rounded border border-zinc-700 bg-black p-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
          Hints
        </p>
        <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">
          {challenge.hints.map((hint) => (
            <li key={hint}>- {hint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LoginPreview() {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-cyan-200">
          AI
        </div>
        <div>
          <p className="text-sm font-bold">Generated Login</p>
          <p className="text-xs text-zinc-500">beta build / review needed</p>
        </div>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Email
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
          readOnly
          value="rookie@example.test"
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        Password
        <input
          className="mt-2 h-11 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-800"
          readOnly
          type="password"
          value="quest-password"
        />
      </label>

      <button
        type="button"
        className="mt-4 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white"
      >
        Sign in
      </button>
    </div>
  );
}

function CommentsPreview() {
  const samples: Array<{ author: string; text: string; tone?: "rose" }> = [
    { author: "admin", text: "Welcome to the board!" },
    { author: "happy_user", text: "looks great!" },
    {
      author: "attacker",
      text: "<script>window.__pwned__=true</script>",
      tone: "rose",
    },
  ];

  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-zinc-950 text-sm font-black text-amber-200">
          CB
        </div>
        <div>
          <p className="text-sm font-bold">Comment Board</p>
          <p className="text-xs text-zinc-500">mvp build / review needed</p>
        </div>
      </div>

      <div className="grid gap-2">
        {samples.map((s) => (
          <div
            key={`${s.author}:${s.text}`}
            className={`rounded border px-3 py-2 text-sm ${
              s.tone === "rose"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-zinc-300 bg-white"
            }`}
          >
            <span className="font-bold">{s.author}</span>: {s.text}
          </div>
        ))}
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">
        新しいコメント
        <textarea
          className="mt-2 h-20 w-full resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
          readOnly
          value="<script>window.__pwned__=true</script>"
        />
      </label>

      <button
        type="button"
        className="mt-3 h-11 w-full rounded bg-zinc-950 text-sm font-bold text-white"
      >
        投稿する
      </button>
    </div>
  );
}

function ProfilePreview() {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-100 p-4 text-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-sm font-black text-cyan-200">
            U2
          </div>
          <div>
            <p className="text-sm font-bold">user-2 のプロフィール</p>
            <p className="text-xs text-zinc-500">
              ログイン中: user-1 / 認可チェック未実装
            </p>
          </div>
        </div>
        <span className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
          IDOR
        </span>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-2">
          <dt className="text-zinc-500">name</dt>
          <dd className="font-semibold text-zinc-900">Bob</dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-2">
          <dt className="text-zinc-500">email</dt>
          <dd className="font-semibold text-zinc-900">bob@example.com</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-zinc-500">secret</dt>
          <dd className="font-semibold text-rose-700">
            CONFIDENTIAL: launch codes
          </dd>
        </div>
      </dl>

      <div className="mt-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
        URL の :id を user-2 に書き換えるだけで、本人ではないアカウントの情報が読めてしまう状態です。
      </div>
    </div>
  );
}
