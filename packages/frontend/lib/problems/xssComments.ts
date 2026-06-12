import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "const comments = [];",
  "let nextId = 1;",
  "",
  "comments.push({ id: nextId++, author: 'admin', text: 'Welcome to the board!' });",
  "",
  "app.get('/health', (req, res) => {",
  "  res.json({ status: 'ok' });",
  "});",
  "",
  "app.post('/comments', (req, res) => {",
  "  const { author, text } = req.body || {};",
  "",
  "  if (typeof author !== 'string' || typeof text !== 'string') {",
  "    return res.status(400).json({ ok: false, error: 'author and text must be strings' });",
  "  }",
  "",
  "  const id = nextId++;",
  "  comments.push({ id, author, text });",
  "  res.json({ ok: true, id });",
  "});",
  "",
  "// VULNERABLE RENDER ENDPOINT",
  "// This intentionally concatenates user input directly into HTML.",
  "// This is the vulnerability users must find and fix.",
  "app.get('/comments', (req, res) => {",
  "  res.setHeader('Content-Type', 'text/html');",
  "",
  "  const rendered = comments",
  "    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
  "    .join('\\n');",
  "",
  "  res.send(",
  "    `<!doctype html>",
  "<html>",
  "  <head><title>Comments</title></head>",
  "  <body>",
  "    <h1>Comments</h1>",
  "    ${rendered}",
  "  </body>",
  "</html>`",
  "  );",
  "});",
  "",
  "app.post('/reset', (req, res) => {",
  "  comments.length = 0;",
  "  nextId = 1;",
  "  comments.push({ id: nextId++, author: 'admin', text: 'Welcome to the board!' });",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => {",
  "  console.log(`xss-comments vulnerable app listening on port ${PORT}`);",
  "});",
].join("\n");

const SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -24,6 +24,10 @@",
  "   res.json({ ok: true, id });",
  " });",
  "",
  "+function escapeHtml(s) {",
  "+  return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));",
  "+}",
  "+",
  " // VULNERABLE RENDER ENDPOINT",
  " // This intentionally concatenates user input directly into HTML.",
  " // This is the vulnerability users must find and fix.",
  "@@ -31,7 +35,7 @@",
  "   res.setHeader('Content-Type', 'text/html');",
  "",
  "   const rendered = comments",
  "-    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
  "+    .map((c) => `<div class=\"comment\"><b>${escapeHtml(c.author)}</b>: ${escapeHtml(c.text)}</div>`)",
  "     .join('\\n');",
  "",
  "   res.send(",
].join("\n") + "\n";

export const xssComments: ProblemContent = {
  id: "xss-comments",
  vulnerability: "XSS",
  title: "コメント掲示板から script を追い出せ",
  shortDescription:
    "コメント本文を直接HTMLへ流し込んでいる掲示板を診断し、<script> が動かないコードへ修正します。",
  scenario:
    "コメント掲示板アプリは投稿されたテキストをそのままHTMLに埋め込んで表示している。攻撃者が <script> や onerror などを混ぜたコメントを投稿すると、閲覧した別のユーザーのブラウザでスクリプトが動いてしまう。攻撃テストで動作を確認し、出力時に正しくエスケープするコードへ修正する。",
  vulnerableAppTitle: "Comment Board / mvp-0.2",
  targetEndpoint: "GET /comments",
  learnSummary:
    "XSS（クロスサイトスクリプティング）の原因と、HTMLエスケープによる防御",
  attackGoal:
    "コメント本文に <script> タグや onerror 属性を仕込んで、サーバーがそのまま HTML に流し込み、他のユーザーのブラウザで JavaScript を実行させる。",
  causeSummary:
    "ユーザー入力をHTMLとしてそのまま結合しているため、タグやイベントハンドラがブラウザに「コード」として解釈されてしまいます。出力時にHTMLエスケープして「ただの文字列」として表示する方向の修正を目指します。",
  attackPayload: "<script>window.__pwned__=true</script>",
  attackVerifiedMessage:
    "コメント中の <script> がHTMLに紛れ込み、ブラウザで実行可能な状態になりました",
  attackVerifyDisclaimer:
    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
  defenseSuccessFlavor:
    "投稿内容がエスケープされ、タグではなくただの文字列として表示されています。",
  defenseFailureFlavor:
    "まだコメント中のタグや属性がブラウザに「コード」として解釈される可能性があります。",
  previewKind: "comments",
  liveViewMode: "iframe",
  stepCopy: {
    step1Description:
      "コメント投稿フォームに <script> を仕込んだ疑似攻撃を実行し、HTML にそのまま埋め込まれることを確認しましょう。",
    step2Description:
      "コメント描画部分で、ユーザー入力がエスケープされずにHTML文字列に結合されている箇所を探します。",
    step3Description:
      "出力時にHTMLエスケープを挟む方向へコードを修正しましょう。",
    step4Description:
      "修正後のレスポンスに、エスケープされた形(`&lt;script&gt;`など)で出るか、疑似判定で確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "コメントの author / text を、エスケープせずに直接 HTML 文字列の中へ差し込んでいます。ここを通った時点で攻撃文字列が「ただの文字」から「タグ」に変わります。",
    nextActionAttacked:
      "次にコードを読み、ユーザー入力がHTML文字列に直接差し込まれている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "コメントの出力時にエスケープされていない箇所を確認できました。次はコードを修正しましょう。",
    stepperStep2Subtitle: "HTMLへの埋め込み方を見る",
  },
  progress: {
    attackedSummary: "<script> がそのままHTMLに混入することを確認済み",
  },
  explanation:
    "ユーザー入力をエスケープせずにHTML文字列へ結合していることが原因です。&, <, >, \", ' の5文字をHTMLエンティティに置き換えてから埋め込むと、攻撃文字列が「ただの文字列」として表示され、ブラウザがタグとして実行することを防げます。",
  hints: [
    "<b>hello</b> という文字列をそのままコメントとして投稿し、コメント一覧を開くと何が起きますか？太字になりますか、それともそのまま <b>hello</b> と表示されますか？",
    "サーバーがユーザー入力を「HTMLの構造の一部」として扱っているのが原因です。表示する前に &, <, >, \", ' の特殊文字を HTML エンティティに変換する必要があります。",
    "小さなヘルパー関数で上記の5文字を置換し、author と text の両方を描画する直前にそれを通す形に書き換えてみましょう。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "regex-strip-script",
      title: "<script> 形式だけを置換する",
      description:
        "`String(text).replace(/<script...>/gi, '')` のように、特定タグだけを消す案です。別のHTML表現も想定して比べてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
        "    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${String(c.text).replace(/<script[^>]*>.*?<\\/script>/gi, '')}</div>`)",
      ),
      isCorrect: false,
    },
    {
      id: "escape-html",
      title: "表示直前にHTML用の文字へ変換する",
      description:
        "`escapeHtml(c.author)` と `escapeHtml(c.text)` のように、HTMLへ差し込む直前で文字を変換する案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "content-type-plain",
      title: "レスポンス種別をテキストに変える",
      description:
        "`res.setHeader('Content-Type', 'text/plain')` のように、返す形式だけを変更する案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  res.setHeader('Content-Type', 'text/html');",
        "  res.setHeader('Content-Type', 'text/plain');",
      ),
      isCorrect: false,
    },
    {
      id: "limit-text-length",
      title: "投稿テキストの長さだけを縛る",
      description:
        "`text.length > 200` を 400 で弾く案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  if (typeof author !== 'string' || typeof text !== 'string') {\n    return res.status(400).json({ ok: false, error: 'author and text must be strings' });\n  }",
        "  if (typeof author !== 'string' || typeof text !== 'string') {\n    return res.status(400).json({ ok: false, error: 'author and text must be strings' });\n  }\n  if (author.length > 32 || text.length > 200) {\n    return res.status(400).json({ ok: false, error: 'too long' });\n  }",
      ),
      isCorrect: false,
    },
    {
      id: "strip-angle-brackets",
      title: "< と > だけを取り除く",
      description:
        "`text.replace(/[<>]/g, '')` のように、出力直前で `<` と `>` を取り除く案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
        "    .map((c) => `<div class=\"comment\"><b>${String(c.author).replace(/[<>]/g, '')}</b>: ${String(c.text).replace(/[<>]/g, '')}</div>`)",
      ),
      isCorrect: false,
    },
  ],
};
