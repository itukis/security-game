import type { ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "",
  "const app = express();",
  "app.use(express.urlencoded({ extended: true }));",
  "app.use(express.json());",
  "",
  "const ADMIN_API_KEY = 'sk-review-admin-ledger-12345';",
  "",
  "let accounts = {",
  "  'user-1': { id: 'user-1', owner: 'Alice', email: 'alice@example.com', balance: 10000, secretNote: 'VIP limit: 50000' },",
  "  'user-2': { id: 'user-2', owner: 'Bob', email: 'bob@example.com', balance: 500, secretNote: 'Collections hold' },",
  "};",
  "",
  "app.use((req, _res, next) => {",
  "  req.userId = req.headers['x-user-id'] || 'user-1';",
  "  next();",
  "});",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE: admin key is shipped to the browser.",
  "app.get('/', (_req, res) => {",
  "  res.send(`<!doctype html>",
  "<html><body>",
  "  <h1>Account Center</h1>",
  "  <p id=\"summary\"></p>",
  "  <script>",
  "    const ADMIN_API_KEY = '${ADMIN_API_KEY}';",
  "    fetch('/api/admin/accounts', { headers: { 'Authorization': 'Bearer ' + ADMIN_API_KEY } })",
  "      .then(r => r.json())",
  "      .then(d => document.getElementById('summary').textContent = d.accounts.length + ' accounts loaded');",
  "  </script>",
  "</body></html>`);",
  "});",
  "",
  "// VULNERABLE: IDOR, because URL :id is trusted without authorization.",
  "app.get('/account/:id', (req, res) => {",
  "  const account = accounts[req.params.id];",
  "  if (!account) return res.status(404).json({ error: 'Account not found' });",
  "  res.json(account);",
  "});",
  "",
  "app.get('/balance', (req, res) => {",
  "  const account = accounts[req.userId];",
  "  res.json({ userId: req.userId, balance: account ? account.balance : 0 });",
  "});",
  "",
  "// VULNERABLE: state-changing transfer accepts requests without a CSRF token.",
  "app.post('/transfer', (req, res) => {",
  "  const { to, amount } = req.body;",
  "  const amt = parseInt(amount, 10);",
  "  if (!to || !amt || amt <= 0) return res.status(400).json({ error: 'Invalid transfer' });",
  "  if (!accounts[to]) return res.status(404).json({ error: 'Recipient not found' });",
  "  if ((accounts[req.userId]?.balance || 0) < amt) return res.status(400).json({ error: 'Insufficient funds' });",
  "  accounts[req.userId].balance -= amt;",
  "  accounts[to].balance += amt;",
  "  res.json({ success: true, newBalance: accounts[req.userId].balance });",
  "});",
  "",
  "app.get('/api/admin/accounts', (req, res) => {",
  "  if (req.headers.authorization === `Bearer ${ADMIN_API_KEY}`) {",
  "    return res.json({ accounts: Object.values(accounts) });",
  "  }",
  "  res.status(401).json({ error: 'Unauthorized' });",
  "});",
  "",
  "app.post('/reset', (_req, res) => {",
  "  accounts = {",
  "    'user-1': { id: 'user-1', owner: 'Alice', email: 'alice@example.com', balance: 10000, secretNote: 'VIP limit: 50000' },",
  "    'user-2': { id: 'user-2', owner: 'Bob', email: 'bob@example.com', balance: 500, secretNote: 'Collections hold' },",
  "  };",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`review-account-workflow listening on ${PORT}`));",
].join("\n");

export const reviewAccountWorkflow: ProblemContent = {
  id: "review-account-workflow",
  vulnerability: "Composite Review",
  difficulty: "Hard",
  title: "口座センターの権限境界を引き直せ",
  shortDescription:
    "IDOR、CSRF、ブラウザへの管理者キー露出をまとめて診断し、認可・リクエスト検証・秘密情報管理を復習します。",
  scenario:
    "口座管理センターでは、ユーザーの口座詳細、送金、管理者向け一覧が同じアプリに同居しています。URLのIDを変えるだけで他人の口座を読め、CSRFトークンなしで送金でき、さらに管理者キーがHTMLに露出しています。3つの境界をすべて引き直してください。",
  vulnerableAppTitle: "Account Center / review-2",
  targetEndpoint: "GET /account/:id + POST /transfer + GET /",
  learnSummary:
    "認証と認可の違い、CSRFトークン、ブラウザに秘密を渡さない設計",
  attackGoal:
    "user-1 として user-2 の口座情報を読み、トークンなし送金を成立させ、HTMLソースから管理者キーを見つける。",
  causeSummary:
    "本人確認、リクエスト出元の確認、秘密情報の配置という3つの境界が抜けています。対象リソースの認可、状態変更のCSRF検証、サーバー側プロキシ化をそれぞれ入れる必要があります。",
  attackPayload:
    "GET /account/user-2 as user-1 / POST /transfer tokenなし / HTML内 sk-review-admin...",
  attackVerifiedMessage:
    "IDOR、CSRF、管理者キー露出の少なくとも1つが成立しました",
  attackVerifyDisclaimer:
    "複合攻撃を実行し、3つの権限境界がすべて機能しているかを検証します。",
  defenseSuccessFlavor:
    "本人以外の口座参照、トークンなし送金、HTML上の秘密情報露出がすべて止まっています。",
  defenseFailureFlavor:
    "まだ認可・CSRF・秘密情報管理のいずれかに抜けがあります。",
  previewKind: "accountWorkflow",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "プレビューまたは自動攻撃で、他人の口座参照・トークンなし送金・HTML上のキー露出を確認しましょう。",
    step2Description:
      "req.userId と URL :id、POST /transfer のヘッダ、GET / のHTMLテンプレートを順番に確認します。",
    step3Description:
      "本人確認、CSRFトークンの発行/検証、クライアントから鍵を消すサーバー側経路を実装してください。",
    step4Description:
      "3つの攻撃がすべて失敗するか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "認証済みであることは、任意の口座を読んだり送金したりしてよいことを意味しません。さらに、ブラウザに届く値は秘密として扱えません。",
    nextActionAttacked:
      "次にコードを読み、本人確認・CSRF検証・秘密情報の置き場所を確認しましょう。",
    nextActionCodeReviewed:
      "3つの境界の抜けを確認できました。次はコードを直接修正しましょう。",
    stepperStep2Subtitle: "権限境界を見る",
  },
  progress: {
    attackedSummary: "IDOR / CSRF / 秘密情報露出の複合攻撃を確認済み",
  },
  explanation:
    "IDORはリクエスト元と対象IDの比較、CSRFはサーバー発行トークンの検証、秘密情報露出はクライアントへ鍵を渡さない設計で防ぎます。どれか1つだけでは口座センター全体の境界は守れません。",
  hints: [
    "GET /account/:id では、プロフィール取得前に req.userId と req.params.id を比較してください。",
    "POST /transfer は状態変更です。X-CSRF-Token を必須にし、サーバー側で発行済みトークンと照合してください。",
    "GET / のHTMLから `ADMIN_API_KEY` という文字列と鍵の値が消えるよう、ブラウザはサーバー側プロキシだけを呼ぶ形にしてください。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [],
};
