import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const app = express();",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE REDIRECT ENDPOINT",
  "// Hands the value of ?redirect= directly to res.redirect without checking",
  "// whether the destination is on our own site. Attackers can craft links",
  "// like /login-success?redirect=https://evil.example.com to bounce victims",
  "// to phishing pages after a legitimate-looking login.",
  "app.get('/login-success', (req, res) => {",
  "  const redirectTo = req.query.redirect || '/dashboard';",
  "  res.redirect(redirectTo);",
  "});",
  "",
  "app.get('/dashboard', (_req, res) => {",
  "  res.send('<!doctype html><html><body><h1>Dashboard</h1><p>Welcome back!</p></body></html>');",
  "});",
  "",
  "app.post('/reset', (_req, res) => res.json({ ok: true }));",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`open-redirect listening on ${PORT}`));",
].join("\n");

const SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -9,7 +9,11 @@",
  " // like /login-success?redirect=https://evil.example.com to bounce victims",
  " // to phishing pages after a legitimate-looking login.",
  " app.get('/login-success', (req, res) => {",
  "-  const redirectTo = req.query.redirect || '/dashboard';",
  "+  const raw = req.query.redirect || '/dashboard';",
  "+  const redirectTo = typeof raw === 'string' ? raw : '/dashboard';",
  "+  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {",
  "+    return res.status(400).send('Bad Request');",
  "+  }",
  "   res.redirect(redirectTo);",
  " });",
  "",
].join("\n") + "\n";

export const openRedirect: ProblemContent = {
  id: "open-redirect",
  vulnerability: "Open Redirect",
  title: "ログイン後リダイレクトの脱出を止めろ",
  shortDescription:
    "redirect パラメータを検証せずに外部URLへ飛ばしてしまうログイン成功ページを診断し、内部パスのみに限定するコードへ修正します。",
  scenario:
    "ログイン成功ページは ?redirect= の値をそのまま res.redirect に渡している。" +
    "攻撃者は redirect=https://evil.example.com を仕込んだリンクを配り、被害者が正規ログインの直後に攻撃者の用意したフィッシングサイトへ飛ばされる、という導線を作れる。" +
    "攻撃テストで外部URLへリダイレクトされることを確認し、相対パスのみ許可する方向へコードを修正しよう。",
  vulnerableAppTitle: "Auth Service / mvp-0.2",
  targetEndpoint: "GET /login-success?redirect=<url>",
  learnSummary:
    "Open Redirect の原因と、リダイレクト先のホワイトリスト/相対パス検証による防御",
  attackGoal:
    "/login-success?redirect=https://evil.example.com を踏ませ、ログイン直後に外部の偽サイトへ被害者のブラウザを連れていく。",
  causeSummary:
    "redirect クエリの値を検証せずに res.redirect に渡しているため、絶対URLでもプロトコル相対URLでも何でも通ってしまいます。" +
    "受け取った値が『/ で始まり // で始まらない相対パス』であることを確かめてからリダイレクトする方向の修正を目指します。",
  attackPayload: "GET /login-success?redirect=https://evil.example.com",
  attackVerifiedMessage:
    "外部サイトへのリダイレクトが成功しました — フィッシングに悪用できます",
  attackVerifyDisclaimer:
    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
  defenseSuccessFlavor:
    "外部URLや // 始まりのパスを 400 で弾けています。リダイレクト先がアプリ内に限定されます。",
  defenseFailureFlavor:
    "まだ任意の外部URLにリダイレクトできる可能性が残っています。",
  previewKind: "redirect",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "redirect=https://evil.example.com を渡したリクエストを実行し、外部URLへの 302 リダイレクトが返ることを確認しましょう。",
    step2Description:
      "ログイン成功ハンドラの中で、redirect の値を検証せずに res.redirect に渡している箇所を探します。",
    step3Description:
      "値が / で始まり // で始まらないことを確かめる方向へコードを修正しましょう。",
    step4Description:
      "外部URLや // 始まりのパスが 400 で弾かれるか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "req.query.redirect の中身を一切確かめずに res.redirect に渡しています。絶対URLでもプロトコル相対URLでも何でも通ってしまいます。",
    nextActionAttacked:
      "次にコードを読み、リダイレクト先の検証が抜けている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "値を無検証でリダイレクトに渡している箇所を確認できました。次はコードを修正しましょう。",
    stepperStep2Subtitle: "リダイレクト先の検証を見る",
  },
  progress: {
    attackedSummary: "外部URLへのリダイレクトが成功することを確認済み",
  },
  explanation:
    "Open Redirect は、信頼できる正規ドメインのURLが攻撃者の指定する任意のURLへユーザーを飛ばしてしまう脆弱性です。" +
    "正規ログインの直後に発火するため、被害者は『自分のサイトの一部』だと信じやすく、フィッシングと組み合わせると致命的です。" +
    "防御の基本は『リダイレクト先は内部の相対パスだけ』と決め切ることです。/ で始まり // で始まらないことを確認し、それ以外は 400 で弾きます。" +
    "外部ドメインに飛ばしたい場合はホワイトリストで明示的に許可する形にしましょう。",
  hints: [
    "redirect=https://evil.example.com を渡すと、サーバーは Location ヘッダにどんな値を入れて 302 を返すと思いますか？",
    "リダイレクト先は『/ で始まる相対パス』だけに絞ると、外部URLに飛ばされる経路を断てます。",
    "ただし //evil.example.com のような『プロトコル相対URL』も外部に出てしまうので、startsWith('//') のチェックも忘れずに入れましょう。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "block-http",
      title: "http:// のケースだけ拒否する",
      description:
        "`redirectTo.startsWith('http://')` のときに 400 を返す案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const redirectTo = req.query.redirect || '/dashboard';\n  res.redirect(redirectTo);",
        "  const redirectTo = req.query.redirect || '/dashboard';\n  if (typeof redirectTo === 'string' && redirectTo.startsWith('http://')) return res.status(400).send('Bad Request');\n  res.redirect(redirectTo);",
      ),
      isCorrect: false,
    },
    {
      id: "relative-only",
      title: "アプリ内パスの形だけを通す",
      description:
        "`redirectTo.startsWith('/') && !redirectTo.startsWith('//')` のように、遷移先の形を確認する案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "warn-only",
      title: "遷移先をログに出してから進める",
      description:
        "`console.warn('redirecting to', redirectTo)` を追加し、遷移先を記録してから `res.redirect` する案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const redirectTo = req.query.redirect || '/dashboard';\n  res.redirect(redirectTo);",
        "  const redirectTo = req.query.redirect || '/dashboard';\n  console.warn('redirecting to', redirectTo);\n  res.redirect(redirectTo);",
      ),
      isCorrect: false,
    },
    {
      id: "block-evil-substring",
      title: "evil という文字列が含まれていたら拒否",
      description:
        "`/evil/i.test(redirectTo)` を 400 で弾く案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const redirectTo = req.query.redirect || '/dashboard';\n  res.redirect(redirectTo);",
        "  const redirectTo = req.query.redirect || '/dashboard';\n  if (typeof redirectTo === 'string' && /evil/i.test(redirectTo)) return res.status(400).send('Bad Request');\n  res.redirect(redirectTo);",
      ),
      isCorrect: false,
    },
    {
      id: "use-302-explicitly",
      title: "リダイレクト種別を明示する",
      description:
        "`res.redirect(302, redirectTo)` のように、ステータスコードを明示する案です。ステータスコードと遷移先検証は別問題であることに注意。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const redirectTo = req.query.redirect || '/dashboard';\n  res.redirect(redirectTo);",
        "  const redirectTo = req.query.redirect || '/dashboard';\n  res.redirect(302, redirectTo);",
      ),
      isCorrect: false,
    },
  ],
};
