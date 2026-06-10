import type { ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const Database = require('better-sqlite3');",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "const db = new Database(':memory:');",
  "db.exec(`",
  "CREATE TABLE agents (id TEXT PRIMARY KEY, email TEXT, password TEXT, name TEXT);",
  "INSERT INTO agents VALUES ('agent-1','alice@support.local','correct-horse','Alice');",
  "INSERT INTO agents VALUES ('agent-2','bob@support.local','battery-staple','Bob');",
  "CREATE TABLE tickets (id TEXT PRIMARY KEY, title TEXT, customerEmail TEXT);",
  "INSERT INTO tickets VALUES ('100','Login trouble','customer@example.com');",
  "`);",
  "",
  "let nextCommentId = 2;",
  "const comments = [",
  "  { id: 1, ticketId: '100', author: 'system', body: 'Initial triage note.' },",
  "];",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE: SQL injection in the agent login query.",
  "app.post('/agent/login', (req, res) => {",
  "  const { email, password } = req.body || {};",
  "  if (!email || !password) {",
  "    return res.status(400).json({ success: false, error: 'Missing credentials' });",
  "  }",
  "",
  "  const sql = `SELECT * FROM agents WHERE email = '${email}' AND password = '${password}'`;",
  "  const agent = db.prepare(sql).get();",
  "  if (!agent) return res.json({ success: false });",
  "  res.json({ success: true, agent: { id: agent.id, email: agent.email, name: agent.name } });",
  "});",
  "",
  "app.post('/tickets/:id/comments', (req, res) => {",
  "  const { author, body } = req.body || {};",
  "  if (typeof author !== 'string' || typeof body !== 'string') {",
  "    return res.status(400).json({ error: 'author and body must be strings' });",
  "  }",
  "  const comment = { id: nextCommentId++, ticketId: req.params.id, author, body };",
  "  comments.push(comment);",
  "  res.json({ ok: true, id: comment.id });",
  "});",
  "",
  "// VULNERABLE: comments are rendered into HTML without escaping.",
  "app.get('/tickets/:id', (req, res) => {",
  "  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);",
  "  if (!ticket) return res.status(404).send('Ticket not found');",
  "  const rendered = comments",
  "    .filter((comment) => comment.ticketId === req.params.id)",
  "    .map((comment) => `<li><b>${comment.author}</b>: ${comment.body}</li>`)",
  "    .join('\\n');",
  "  res.setHeader('Content-Type', 'text/html');",
  "  res.send(`<!doctype html><html><body><h1>${ticket.title}</h1><ul>${rendered}</ul></body></html>`);",
  "});",
  "",
  "// VULNERABLE: any absolute URL can be used as a post-login redirect.",
  "app.get('/handoff', (req, res) => {",
  "  const next = req.query.next || '/tickets/100';",
  "  res.redirect(next);",
  "});",
  "",
  "app.post('/reset', (_req, res) => {",
  "  comments.length = 0;",
  "  comments.push({ id: 1, ticketId: '100', author: 'system', body: 'Initial triage note.' });",
  "  nextCommentId = 2;",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`review-support-portal listening on ${PORT}`));",
].join("\n");

export const reviewSupportPortal: ProblemContent = {
  id: "review-support-portal",
  vulnerability: "Composite Review",
  difficulty: "Hard",
  title: "サポートポータルの3つの入口をまとめて塞げ",
  shortDescription:
    "ログイン、チケットコメント、ログイン後遷移に潜む SQLi / XSS / Open Redirect をまとめて修正します。",
  scenario:
    "初級編を終えた人向けの復習問題です。サポート担当者向けポータルには、認証クエリ、チケットコメントのHTML描画、ログイン後の handoff リダイレクトが同じ server.js にまとまっています。1つだけ直してもクリアにはならず、3つの入口をすべて安全にしてください。",
  vulnerableAppTitle: "Support Portal / review-1",
  targetEndpoint: "POST /agent/login + GET /tickets/:id + GET /handoff",
  learnSummary:
    "SQLインジェクション、保存型XSS、Open Redirectを同じ画面遷移の中で見つけて直す",
  attackGoal:
    "SQL構文を混ぜたログイン突破、コメントHTMLへのスクリプト混入、外部URLへのリダイレクトを順に成立させる。",
  causeSummary:
    "入力が SQL / HTML / URL 遷移先という別々の文脈へそのまま渡されています。文脈ごとの防御、つまりプリペアドステートメント、HTMLエスケープ、内部パス限定を使い分ける必要があります。",
  attackPayload:
    "' OR 1=1-- / <script>window.__pwned__=true</script> / https://evil.example.com",
  attackVerifiedMessage:
    "ログイン突破、コメントXSS、外部リダイレクトの少なくとも1つが成立しました",
  attackVerifyDisclaimer:
    "複合攻撃を実行し、3つの弱点がすべて塞がれているかを検証します。",
  defenseSuccessFlavor:
    "SQL、HTML、リダイレクト先の各文脈で入力が安全に扱われています。",
  defenseFailureFlavor:
    "3つの入口のうち、まだ少なくとも1つに攻撃が刺さります。",
  previewKind: "supportPortal",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "自動攻撃またはプレビューで、ログイン突破・コメントXSS・外部リダイレクトが起きることを確認しましょう。",
    step2Description:
      "同じ server.js の中で、入力が SQL / HTML / redirect に渡る3箇所を探します。",
    step3Description:
      "プリペアドステートメント、HTMLエスケープ、内部パス限定をそれぞれの文脈に合わせて実装してください。",
    step4Description:
      "3つの攻撃がすべて失敗するか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "同じ入力検証では3種類の弱点を同時に防げません。SQLには値バインド、HTMLには出力時エスケープ、redirectには遷移先の形の検証が必要です。",
    nextActionAttacked:
      "次にコードを読み、SQL・HTML・URLの各文脈へ入力が直接入っている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "3つの原因箇所を確認できました。次はコードを直接修正しましょう。",
    stepperStep2Subtitle: "3つの文脈を見分ける",
  },
  progress: {
    attackedSummary: "SQLi / XSS / Open Redirect の複合攻撃を確認済み",
  },
  explanation:
    "SQL、HTML、URLはそれぞれ安全な扱い方が違います。SQL文字列への結合はプリペアドステートメントへ、HTMLへの埋め込みはエスケープへ、リダイレクト先は / で始まり // で始まらない内部パスだけへ限定することで、3つの弱点をまとめて塞げます。",
  hints: [
    "まず `email` と `password` が SQL 文字列の中にそのまま入っていないか確認してください。",
    "チケットコメントの `author` と `body` は、保存時よりも HTML に出す直前でエスケープするのが基本です。",
    "`next=https://...` と `next=//evil...` の両方を弾ける条件になっているか確認してください。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [],
};
