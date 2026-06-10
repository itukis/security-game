import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const app = express();",
  "app.use(express.urlencoded({ extended: true }));",
  "app.use(express.json());",
  "",
  "let balance = { 'user-1': 10000, 'user-2': 500 };",
  "",
  "app.use((req, _res, next) => {",
  "  req.userId = req.headers['x-user-id'] || 'user-1';",
  "  next();",
  "});",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "app.get('/balance', (req, res) => {",
  "  res.json({ userId: req.userId, balance: balance[req.userId] || 0 });",
  "});",
  "",
  "// VULNERABLE TRANSFER ENDPOINT",
  "// Accepts POST without verifying that the request actually originated from the",
  "// app's own UI. An attacker page can submit a hidden form on the victim's",
  "// behalf and silently move money — classic CSRF (Cross-Site Request Forgery).",
  "app.post('/transfer', (req, res) => {",
  "  const { to, amount } = req.body;",
  "  const amt = parseInt(amount, 10);",
  "  if (!to || !amt || amt <= 0) return res.status(400).json({ error: 'Invalid transfer' });",
  "  if ((balance[req.userId] || 0) < amt) return res.status(400).json({ error: 'Insufficient funds' });",
  "  balance[req.userId] -= amt;",
  "  balance[to] = (balance[to] || 0) + amt;",
  "  res.json({ success: true, newBalance: balance[req.userId] });",
  "});",
  "",
  "app.post('/reset', (_req, res) => {",
  "  balance = { 'user-1': 10000, 'user-2': 500 };",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`csrf-transfer listening on ${PORT}`));",
].join("\n");

const SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -5,6 +5,8 @@",
  "",
  " let balance = { 'user-1': 10000, 'user-2': 500 };",
  "",
  "+const csrfTokens = new Set();",
  "+",
  " app.use((req, _res, next) => {",
  "   req.userId = req.headers['x-user-id'] || 'user-1';",
  "   next();",
  "@@ -16,11 +18,22 @@",
  "   res.json({ userId: req.userId, balance: balance[req.userId] || 0 });",
  " });",
  "",
  "+app.get('/csrf-token', (_req, res) => {",
  "+  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);",
  "+  csrfTokens.add(token);",
  "+  res.json({ token });",
  "+});",
  "+",
  " // VULNERABLE TRANSFER ENDPOINT",
  " // Accepts POST without verifying that the request actually originated from the",
  " // app's own UI. An attacker page can submit a hidden form on the victim's",
  " // behalf and silently move money — classic CSRF (Cross-Site Request Forgery).",
  " app.post('/transfer', (req, res) => {",
  "+  const token = req.headers['x-csrf-token'];",
  "+  if (!token || !csrfTokens.has(token)) {",
  "+    return res.status(403).json({ error: 'CSRF token missing or invalid' });",
  "+  }",
  "+  csrfTokens.delete(token);",
  "   const { to, amount } = req.body;",
].join("\n") + "\n";

export const csrfTransfer: ProblemContent = {
  id: "csrf-transfer",
  vulnerability: "CSRF",
  title: "送金APIをCSRFから守れ",
  shortDescription:
    "CSRFトークンを検証していない送金APIを診断し、外部サイトからの偽装送金を防ぐコードへ修正します。",
  scenario:
    "オンラインバンキングの送金APIは、ログイン中のユーザーからのPOSTリクエストを内容だけで受け付けてしまう。" +
    "攻撃者は罠ページに隠しフォームを置くだけで、被害者のブラウザから本人の名義で送金リクエストを送らせることができる。" +
    "攻撃テストでトークンなしのリクエストが通ることを確認し、CSRFトークンの発行と検証を入れる方向へコードを修正しよう。",
  vulnerableAppTitle: "Banking Transfer / mvp-0.1",
  targetEndpoint: "POST /transfer",
  learnSummary:
    "CSRF(クロスサイトリクエストフォージェリ)の原因と、CSRFトークンによる防御",
  attackGoal:
    "外部サイトを模した状態で、CSRFトークンを一切付けずに POST /transfer {to:'user-2', amount:1000} を送り、本人の残高から送金を成立させる。",
  causeSummary:
    "送金APIがリクエストの出元を確かめておらず、ボディの値だけで処理してしまっています。" +
    "サーバー側でトークンを発行し、状態を変更する操作のたびにそのトークンを検証する方向の修正を目指します。",
  attackPayload: "POST /transfer {to:'user-2', amount:1000} (X-CSRF-Token なし)",
  attackVerifiedMessage:
    "外部サイトからの送金リクエストが成功しました — CSRFトークンなしで送金できてしまいます",
  attackVerifyDisclaimer:
    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
  defenseSuccessFlavor:
    "トークン未付与のリクエストを 403 で弾けています。罠ページからの送金を防げます。",
  defenseFailureFlavor:
    "まだトークンを確かめずに送金処理を実行できる状態です。",
  previewKind: "transfer",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "外部サイトを模してトークンなしの送金リクエストを送り、本人の残高が動いてしまうことを確認しましょう。",
    step2Description:
      "送金ハンドラの中で、リクエストの出元やトークンを一切検証していない箇所を探します。",
    step3Description:
      "GET /csrf-token でトークンを発行し、POST /transfer で X-CSRF-Token ヘッダを検証する方向へコードを修正しましょう。",
    step4Description:
      "トークンを付けないリクエストが 403 で弾かれるか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "POST /transfer がボディの to/amount だけ見て送金を実行しています。リクエストが自分のUIから来たものか、何のチェックもしていません。",
    nextActionAttacked:
      "次にコードを読み、リクエストの出元を確かめていない箇所を確認しましょう。",
    nextActionCodeReviewed:
      "送金ハンドラに CSRF 検証が無いことを確認できました。次はコードを修正しましょう。",
    stepperStep2Subtitle: "リクエストの出元を検証しているか見る",
  },
  progress: {
    attackedSummary: "トークンなしの送金リクエストが通ることを確認済み",
  },
  explanation:
    "CSRFは、被害者のログインセッションを利用して、罠ページが本人の名前でリクエストを送らせる攻撃です。" +
    "サーバー側でランダムなトークンを発行し、状態を変える操作のリクエストに同じトークンが付いているかを確認することで、罠ページから生成できないトークンを必須化できます。" +
    "Same-Site Cookie や Origin/Referer の確認、二重送信クッキー(double-submit cookie)など他の手段もありますが、基本は『サーバー側でリクエストの出元を必ず検証する』ことです。",
  hints: [
    "別ドメインに置いた HTML から fetch('/transfer', { method:'POST', body:... }) を投げると、ブラウザはどんな Cookie を一緒に送ると思いますか？",
    "サーバー側でランダムなトークンを発行し、ブラウザに保存させてから、POST 時に同じトークンを送り返してもらう方法があります。攻撃者の罠ページはこのトークンを取得できません。",
    "POST /transfer のハンドラ先頭で req.headers['x-csrf-token'] を読み、サーバーが発行した既知トークン集合に含まれていなければ 403 で弾く形にしてみましょう。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "log-transfer",
      title: "送金イベントをログに残す",
      description:
        "`console.log('transfer', req.userId, req.body)` を追加し、あとから送金操作を追跡できるようにする案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "app.post('/transfer', (req, res) => {\n  const { to, amount } = req.body;",
        "app.post('/transfer', (req, res) => {\n  console.log('transfer', req.userId, '->', req.body.to, req.body.amount);\n  const { to, amount } = req.body;",
      ),
      isCorrect: false,
    },
    {
      id: "csrf-token-check",
      title: "一回限りの値を発行して照合する",
      description:
        "`GET /csrf-token` で保存した値と、`req.headers['x-csrf-token']` の値をPOST時に比べる案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "block-user-agent",
      title: "リクエストヘッダの種類で分ける",
      description:
        "`req.headers['user-agent']` を見て、特定のクライアント名なら拒否する案です。ヘッダの信頼性も含めて判断してください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "app.post('/transfer', (req, res) => {\n  const { to, amount } = req.body;",
        "app.post('/transfer', (req, res) => {\n  if (/curl/i.test(req.headers['user-agent'] || '')) return res.status(403).json({ error: 'blocked' });\n  const { to, amount } = req.body;",
      ),
      isCorrect: false,
    },
  ],
};
