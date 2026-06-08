import type {
  PatchOption,
  ProblemPresentation,
  VulnerabilityType,
} from "@/lib/challengeTypes";

// Static, per-problem content. Single source of truth for all 5 missions.
// Loaded by both mock mode (mockChallenges) and real API mode
// (mapProblemToChallenge in lib/api/challenges) so the UI never carries
// vulnerability-specific copy hard-coded into components.
//
// The "correct" patch text mirrors each app's solution.patch on disk so
// that USE_MOCK=false sends a unified diff the orchestrator will accept.
// Wrong options are intentionally illustrative and will either fail to
// apply or fail the post-patch attack — both surface as "防御失敗" in UI.

export type ProblemId =
  | "sqli-login"
  | "xss-comments"
  | "idor-profile"
  | "path-traversal-files"
  | "cmd-injection-ping";

type ProblemContent = ProblemPresentation & {
  id: ProblemId;
  vulnerability: VulnerabilityType;
  title: string;
  shortDescription: string;
  scenario: string;
  vulnerableAppTitle: string;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
  attackPayload: string;
  patchOptions: PatchOption[];
};

const SQLI_SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -27,8 +27,8 @@",
  "   }",
  "",
  "   try {",
  "-    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
  "-    const row = db.prepare(sql).get();",
  "+    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');",
  "+    const row = stmt.get(username, password);",
  "",
  "     if (row) {",
  "       res.json({ success: true, user: { id: row.id, username: row.username } });",
].join("\n") + "\n";

const XSS_SOLUTION_PATCH = [
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

const IDOR_SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -28,6 +28,9 @@",
  " // owns it. Any logged-in user can read any other user's profile by changing",
  " // the URL — classic IDOR (Insecure Direct Object Reference).",
  " app.get('/profile/:id', (req, res) => {",
  "+  if (req.userId !== req.params.id) {",
  "+    return res.status(403).json({ error: 'Forbidden' });",
  "+  }",
  "   const profile = PROFILES[req.params.id];",
  "   if (!profile) {",
  "     return res.status(404).json({ error: 'Profile not found' });",
].join("\n") + "\n";

const SQLI_INITIAL_CODE = [
  "const express = require('express');",
  "const Database = require('better-sqlite3');",
  "const path = require('path');",
  "const fs = require('fs');",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "// Initialize SQLite database",
  "const db = new Database(':memory:');",
  "const initSql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');",
  "db.exec(initSql);",
  "",
  "// Health check",
  "app.get('/health', (req, res) => {",
  "  res.json({ status: 'ok' });",
  "});",
  "",
  "// VULNERABLE LOGIN ENDPOINT",
  "// This intentionally uses string concatenation to build SQL queries.",
  "// This is the vulnerability users must find and fix.",
  "app.post('/login', (req, res) => {",
  "  const { username, password } = req.body;",
  "",
  "  if (!username || !password) {",
  "    return res.status(400).json({ success: false, error: 'Missing username or password' });",
  "  }",
  "",
  "  try {",
  "    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
  "    const row = db.prepare(sql).get();",
  "",
  "    if (row) {",
  "      res.json({ success: true, user: { id: row.id, username: row.username } });",
  "    } else {",
  "      res.json({ success: false });",
  "    }",
  "  } catch (err) {",
  "    res.status(500).json({ success: false, error: err.message });",
  "  }",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => {",
  "  console.log(`sqli-login vulnerable app listening on port ${PORT}`);",
  "});",
].join("\n");

const XSS_INITIAL_CODE = [
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

const IDOR_INITIAL_CODE = [
  "const express = require('express');",
  "const bodyParser = require('body-parser');",
  "",
  "const app = express();",
  "app.use(bodyParser.json());",
  "",
  "// Mock session middleware: treat the X-User-Id header as the authenticated",
  "// user. Falls back to 'user-1' so cURL probes work without setting a header.",
  "// Real JWT/session is intentionally out of scope; this problem is about the",
  "// missing authorization check, not the auth mechanism itself.",
  "app.use((req, _res, next) => {",
  "  req.userId = req.headers['x-user-id'] || 'user-1';",
  "  next();",
  "});",
  "",
  "const PROFILES = {",
  "  'user-1': { id: 'user-1', name: 'Alice', email: 'alice@example.com', secret: 'public bio' },",
  "  'user-2': { id: 'user-2', name: 'Bob',   email: 'bob@example.com',   secret: 'CONFIDENTIAL: launch codes' },",
  "  'user-3': { id: 'user-3', name: 'Carol', email: 'carol@example.com', secret: 'CONFIDENTIAL: bank PIN 4823' },",
  "};",
  "",
  "app.get('/health', (_req, res) => {",
  "  res.json({ status: 'ok' });",
  "});",
  "",
  "// VULNERABLE PROFILE ENDPOINT",
  "// Looks up profile by URL :id without checking that the authenticated user",
  "// owns it. Any logged-in user can read any other user's profile by changing",
  "// the URL — classic IDOR (Insecure Direct Object Reference).",
  "app.get('/profile/:id', (req, res) => {",
  "  const profile = PROFILES[req.params.id];",
  "  if (!profile) {",
  "    return res.status(404).json({ error: 'Profile not found' });",
  "  }",
  "  res.json(profile);",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => {",
  "  console.log(`idor-profile vulnerable app listening on port ${PORT}`);",
  "});",
].join("\n");

const PATH_TRAVERSAL_SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -15,8 +15,12 @@",
  " app.get('/download', (req, res) => {",
  "-  const name = req.query.name;",
  "-  const filePath = path.join(__dirname, 'public', name);",
  "-  fs.readFile(filePath, 'utf8', (err, data) => {",
  "+  const base = path.resolve(__dirname, 'public');",
  "+  const target = path.resolve(base, req.query.name);",
  "+  if (!target.startsWith(base + path.sep)) {",
  "+    return res.status(400).send('Bad Request');",
  "+  }",
  "+  fs.readFile(target, 'utf8', (err, data) => {",
  "     if (err) return res.status(404).send('File not found');",
  "     res.send(data);",
  "   });",
].join("\n") + "\n";

const CMD_INJECTION_SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -1,5 +1,5 @@",
  " const express = require('express');",
  "-const { exec } = require('child_process');",
  "+const { execFile } = require('child_process');",
  " ",
  " const app = express();",
  " app.use(express.json());",
  "@@ -10,7 +10,11 @@",
  " app.post('/ping', (req, res) => {",
  "   const { host } = req.body;",
  "-  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
  "+  if (!/^[a-zA-Z0-9.\\-]+$/.test(host)) {",
  "+    return res.status(400).json({ error: '無効なホスト名です' });",
  "+  }",
  "+  execFile('ping', ['-c', '1', host], (err, stdout, stderr) => {",
  "     res.json({ output: stdout || stderr });",
  "   });",
  " });",
].join("\n") + "\n";

const PATH_TRAVERSAL_INITIAL_CODE = [
  "const express = require('express');",
  "const path = require('path');",
  "const fs = require('fs');",
  "",
  "const app = express();",
  "",
  "// ディレクトリ構成:",
  "//   public/readme.txt  — 一般公開ファイル",
  "//   public/terms.txt   — 一般公開ファイル",
  "//   secret/flag.txt    — 非公開・外部に出してはいけない",
  "",
  "// VULNERABLE DOWNLOAD ENDPOINT",
  "// ユーザー指定のファイル名を直接 path.join に渡しているため、",
  "// ../ を含む名前で public ディレクトリの外に脱出できてしまう。",
  "app.get('/download', (req, res) => {",
  "  const name = req.query.name;",
  "  const filePath = path.join(__dirname, 'public', name);",
  "  fs.readFile(filePath, 'utf8', (err, data) => {",
  "    if (err) return res.status(404).send('File not found');",
  "    res.send(data);",
  "  });",
  "});",
].join("\n");

const CMD_INJECTION_INITIAL_CODE = [
  "const express = require('express');",
  "const { exec } = require('child_process');",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "// VULNERABLE PING ENDPOINT",
  "// host フィールドをシェルコマンド文字列に直接埋め込んでいるため、",
  "// ; や && などのメタ文字で任意のコマンドを追加実行できてしまう。",
  "app.post('/ping', (req, res) => {",
  "  const { host } = req.body;",
  "  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
  "    res.json({ output: stdout || stderr });",
  "  });",
  "});",
].join("\n");

export const problemContent: Record<ProblemId, ProblemContent> = {
  "sqli-login": {
    id: "sqli-login",
    vulnerability: "SQL Injection",
    title: "AIが生成したログイン画面を診断せよ",
    shortDescription:
      "AIで生成されたログイン画面にあるSQLインジェクションを見つけ、認証突破を防ぐ修正を選びます。",
    scenario:
      "AIで生成されたログイン画面に、SQLインジェクションでログイン認証が突破される弱点が含まれている。攻撃テストを実行し、原因コードを確認して、正しい修正案を選ぶ。",
    vulnerableAppTitle: "AI Generated Login / beta-0.3",
    targetEndpoint: "POST /login",
    learnSummary:
      "SQLインジェクションの原因と、プリペアドステートメントによる防御",
    attackGoal:
      "ユーザー名やパスワード欄に SQL の構文を混ぜ込み、本来通らない条件で認証を成立させる。",
    causeSummary:
      "入力値をSQL文字列へ直接結合していることが原因です。プリペアドステートメントで入力値をSQL構文ではなく値として扱う修正を目指します。",
    attackPayload: "' OR '1'='1",
    attackVerifiedMessage: "ログイン認証が突破されました",
    attackVerifyDisclaimer:
      "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
    defenseSuccessFlavor:
      "ユーザー入力をSQL構文ではなく値として渡す修正が効いています。",
    defenseFailureFlavor:
      "まだ入力値がSQL構文として扱われる可能性が残っています。",
    previewKind: "login",
    liveViewMode: "interactive",
    stepCopy: {
      step1Description:
        "まずは疑似攻撃を実行し、SQLインジェクションでログイン認証が突破されることを確認しましょう。",
      step2Description:
        "入力値をSQL文字列に直接結合している箇所を探します。確認できたら次のステップへ進みます。",
      step3Description:
        "プリペアドステートメントなど、入力値をSQL構文ではなく値として扱う修正を選びましょう。",
      step4Description:
        "選んだ修正案でSQLインジェクションを防げるか、学習用の疑似判定で確認します。",
      focusBoxTitle: "見るポイント",
      focusBoxBody:
        "入力値をSQL文字列へ直接結合していることが原因です。この形だと、入力値がSQL構文として扱われる可能性があります。",
      nextActionAttacked:
        "次にコードを読み、原因になっているSQLの組み立て方を確認しましょう。",
      nextActionCodeReviewed:
        "入力値をSQL文字列に直接結合している原因を確認できました。次は修正案を選びましょう。",
      stepperStep2Subtitle: "SQLの組み立て方を見る",
    },
    progress: {
      attackedSummary: "ログイン認証の突破を確認済み",
    },
    explanation:
      "入力値をSQL文字列へ直接結合していることが原因です。プリペアドステートメントを使うと、入力値をSQL構文ではなく値として扱えるため、SQLインジェクションによるログイン突破を防ぎやすくなります。",
    hints: [
      "ユーザー名欄にシングルクォート(')を1文字入れたら、サーバー側のSQLはどう変わると思いますか？クエリの組み立て方を見てください。",
      "問題はユーザー入力が SQL の「構文」の一部になっていることです。多くの SQL ライブラリには、入力値を「データ」として別経路で渡す仕組みがあります。",
      "「parameterized query」や「prepared statement」というキーワードで、使っている SQL ライブラリの正攻法を調べてみましょう。修正は2行程度で済みます。",
    ],
    initialCode: SQLI_INITIAL_CODE,
    patchOptions: [
      {
        id: "raw-sql-trim",
        title: "入力値を trim してから結合する",
        description:
          "空白を取り除くだけでは、SQLの構文として解釈される問題は残ります。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-    const row = db.prepare(sql).get();",
          "+    const row = db.prepare(sql.trim()).get();",
        ].join("\n"),
        isCorrect: false,
      },
      {
        id: "prepared-statement",
        title: "プリペアドステートメントを使う",
        description:
          "入力値をSQL構文ではなく値として渡す、推奨される安全な修正です。",
        patch: SQLI_SOLUTION_PATCH,
        isCorrect: true,
      },
      {
        id: "hide-password",
        title: "パスワード欄を hidden にする",
        description:
          "見た目だけの変更です。サーバー側のSQL組み立てに穴が残ります。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-    res.json({ success: false });",
          "+    res.json({ success: false, hint: 'try again' });",
        ].join("\n"),
        isCorrect: false,
      },
    ],
  },

  "xss-comments": {
    id: "xss-comments",
    vulnerability: "XSS",
    title: "コメント掲示板から script を追い出せ",
    shortDescription:
      "コメント本文を直接HTMLへ流し込んでいる掲示板を診断し、<script> が動かない修正を選びます。",
    scenario:
      "コメント掲示板アプリは投稿されたテキストをそのままHTMLに埋め込んで表示している。攻撃者が <script> や onerror などを混ぜたコメントを投稿すると、閲覧した別のユーザーのブラウザでスクリプトが動いてしまう。攻撃テストで動作を確認し、出力時に正しくエスケープする修正を選ぶ。",
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
        "出力時にHTMLエスケープを挟む方向の修正案を選びましょう。",
      step4Description:
        "修正後のレスポンスに、エスケープされた形(`&lt;script&gt;`など)で出るか、疑似判定で確認します。",
      focusBoxTitle: "見るポイント",
      focusBoxBody:
        "コメントの author / text を、エスケープせずに直接 HTML 文字列の中へ差し込んでいます。ここを通った時点で攻撃文字列が「ただの文字」から「タグ」に変わります。",
      nextActionAttacked:
        "次にコードを読み、ユーザー入力がHTML文字列に直接差し込まれている箇所を確認しましょう。",
      nextActionCodeReviewed:
        "コメントの出力時にエスケープされていない箇所を確認できました。次は修正案を選びましょう。",
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
    initialCode: XSS_INITIAL_CODE,
    patchOptions: [
      {
        id: "regex-strip-script",
        title: "<script> タグだけ正規表現で削る",
        description:
          "<script> だけは消えますが、onerror= や onclick= などの属性経由の攻撃が残ります。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
          "+    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${String(c.text).replace(/<script[^>]*>.*?<\\/script>/gi, '')}</div>`)",
        ].join("\n"),
        isCorrect: false,
      },
      {
        id: "escape-html",
        title: "出力時にHTMLエスケープする",
        description:
          "& < > \" ' の5文字をエンティティへ変換するヘルパーを通し、author と text の両方をエスケープします。",
        patch: XSS_SOLUTION_PATCH,
        isCorrect: true,
      },
      {
        id: "content-type-plain",
        title: "レスポンスを text/plain にする",
        description:
          "見た目は安全に見えますが、HTML表示を期待する画面では使えず、本質的な原因は残ります。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-  res.setHeader('Content-Type', 'text/html');",
          "+  res.setHeader('Content-Type', 'text/plain');",
        ].join("\n"),
        isCorrect: false,
      },
    ],
  },

  "idor-profile": {
    id: "idor-profile",
    vulnerability: "Authentication Bypass",
    title: "プロフィールAPIの覗き見を止めろ",
    shortDescription:
      "プロフィールAPIが URL の ID をそのまま信用してしまう穴を、認可チェックで塞ぎます。",
    scenario:
      "プロフィール参照APIは、URL の :id をキーにプロフィールを返すだけで、リクエストしている本人が本当にそのプロフィールの持ち主かを確認していない。任意のログイン済みユーザーが、他人の ID を URL に入れるだけで他人の情報(秘密のメモなど)を読めてしまう。攻撃テストで確認し、リクエスト元と対象を一致させる認可チェックを入れる方向の修正を選ぶ。",
    vulnerableAppTitle: "Profile API / internal-0.4",
    targetEndpoint: "GET /profile/:id",
    learnSummary:
      "IDOR(Insecure Direct Object Reference)の原因と、認可チェックによる防御",
    attackGoal:
      "user-1 としてログインしたまま、URL の :id を user-2 / user-3 に書き換えて、本来見えないはずの他人のプロフィールを読み出す。",
    causeSummary:
      "「誰がリクエストしているか(req.userId)」と「どの ID にアクセスしようとしているか(req.params.id)」を比べずに、URL の ID をそのまま信用していることが原因です。本人かどうかを確かめてから返す方向の修正を目指します。",
    attackPayload: "GET /profile/user-2  (Header: X-User-Id: user-1)",
    attackVerifiedMessage:
      "user-1 として user-2 のプロフィール(secret付き)が読み出されました",
    attackVerifyDisclaimer:
      "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
    defenseSuccessFlavor:
      "リクエスト元と対象 ID が一致しないアクセスを 403 で弾けています。",
    defenseFailureFlavor:
      "まだ他人の ID を URL に入れただけでプロフィールが取れる状態です。",
    previewKind: "profile",
    liveViewMode: "interactive",
    stepCopy: {
      step1Description:
        "user-1 として認証済みのまま、URL の :id を user-2 に書き換えて他人のプロフィールが返ることを確認しましょう。",
      step2Description:
        "プロフィール取得ハンドラの中で、req.userId と req.params.id を比べていない箇所を探します。",
      step3Description:
        "ハンドラの先頭で「本人か?」を確かめ、違えば 403 を返す方向の修正案を選びましょう。",
      step4Description:
        "他人の ID へのアクセスが 403 で弾かれるか、疑似判定で確認します。",
      focusBoxTitle: "見るポイント",
      focusBoxBody:
        "プロフィールを返す前に、req.userId と req.params.id を見比べていません。誰でも URL の :id を変えれば他人になりすませてしまいます。",
      nextActionAttacked:
        "次にコードを読み、本人確認(認可チェック)が抜けている箇所を確認しましょう。",
      nextActionCodeReviewed:
        "req.userId と req.params.id を見比べていないことを確認できました。次は修正案を選びましょう。",
      stepperStep2Subtitle: "認可チェックの抜けを見る",
    },
    progress: {
      attackedSummary: "他人のプロフィール覗き見が成功することを確認済み",
    },
    explanation:
      "認証(誰か)と認可(その人にこの操作を許してよいか)は別物です。リクエスト元のユーザーIDと、URLで指定された対象IDが一致しない場合は 403 を返し、本人のリソースだけを返すように制限することで、IDOR(Insecure Direct Object Reference)を塞げます。",
    hints: [
      "X-User-Id: user-1 のまま /profile/user-2 を叩くと何が返りますか？本来 user-1 に見えてはいけない情報は混じっていますか？",
      "サーバーは「誰が叩いているか(req.userId)」と「どの ID を要求されているか(req.params.id)」の両方を持っています。やっていないのは、両者を比べることです。",
      "ハンドラの先頭で2つの値を比較し、違っていればプロフィールを引く前に 403 Forbidden を返す形に書き換えてみましょう。",
    ],
    initialCode: IDOR_INITIAL_CODE,
    patchOptions: [
      {
        id: "log-access",
        title: "アクセスログを出す",
        description:
          "誰が誰のプロフィールを見たか記録するだけで、覗き見そのものは止められません。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-app.get('/profile/:id', (req, res) => {",
          "+app.get('/profile/:id', (req, res) => {",
          "+  console.log('profile read', req.userId, '->', req.params.id);",
        ].join("\n"),
        isCorrect: false,
      },
      {
        id: "authz-check",
        title: "ハンドラ先頭で本人確認して 403 を返す",
        description:
          "req.userId と req.params.id が違うときは、プロフィールを引く前に 403 Forbidden を返します。",
        patch: IDOR_SOLUTION_PATCH,
        isCorrect: true,
      },
      {
        id: "hide-secret-field",
        title: "secret フィールドだけ返さない",
        description:
          "一部の項目を隠すだけで、他人の名前やメールは依然として取れてしまいます。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-  res.json(profile);",
          "+  const { secret: _secret, ...safe } = profile;",
          "+  res.json(safe);",
        ].join("\n"),
        isCorrect: false,
      },
    ],
  },

  "path-traversal-files": {
    id: "path-traversal-files",
    vulnerability: "Path Traversal",
    title: "公開ダウンローダーから ../ を締め出せ",
    shortDescription:
      "ファイル名をそのままパスに結合しているダウンロードAPIを診断し、公開ディレクトリの外を読めなくする修正を選びます。",
    scenario:
      "社内ツールの公開ファイルダウンローダーは、クエリパラメータで受け取ったファイル名をそのまま public/ ディレクトリに結合して返している。" +
      "名前に ../ を混ぜると想定外のディレクトリへ脱出でき、非公開ファイルまで読み取れてしまう。" +
      "攻撃テストで動作を確認し、パスを正規化して公開ディレクトリ内に限定する修正を選ぼう。",
    vulnerableAppTitle: "File Downloader / internal-0.2",
    targetEndpoint: "GET /download?name=<filename>",
    learnSummary:
      "パストラバーサルの原因と、パス正規化による公開ディレクトリ外へのアクセス防止",
    attackGoal:
      "name パラメータに ../ を含む文字列を渡し、public/ ディレクトリ外のファイルを読み出す。",
    causeSummary:
      "ユーザー指定のファイル名を検証せずに path.join へ渡しているため、../ でディレクトリを遡れます。" +
      "パスを解決した後で公開ディレクトリの配下かどうかを確かめる方向の修正を目指します。",
    attackPayload: "../../secret/flag.txt",
    attackVerifiedMessage:
      "public/ の外にある非公開ファイルの内容が返ってきました",
    attackVerifyDisclaimer:
      "実際のファイルシステムへはアクセスせず、学習用の疑似判定だけを表示します。",
    defenseSuccessFlavor:
      "パスが public/ 配下かどうかを確かめてから読み込むため、ディレクトリ脱出を弾けています。",
    defenseFailureFlavor:
      "まだ ../ を使って公開ディレクトリの外に脱出できる可能性が残っています。",
    previewKind: "download",
    liveViewMode: "interactive",
    stepCopy: {
      step1Description:
        "name パラメータに ../../secret/flag.txt を渡した疑似攻撃を実行し、想定外ファイルが返ることを確認しましょう。",
      step2Description:
        "ダウンロードハンドラの中で、ファイル名を検証せずに path.join へ渡している箇所を探します。",
      step3Description:
        "パスを正規化して公開ディレクトリ内に限定する方向の修正案を選びましょう。",
      step4Description:
        "../ を含むリクエストが 400 で弾かれるか、疑似判定で確認します。",
      focusBoxTitle: "見るポイント",
      focusBoxBody:
        "req.query.name をそのまま path.join に渡しています。path.join は ../ を解釈して上位ディレクトリへ移動するため、公開ディレクトリの外に出てしまいます。",
      nextActionAttacked:
        "次にコードを読み、ファイル名の検証が抜けている箇所を確認しましょう。",
      nextActionCodeReviewed:
        "path.join に無検証で渡している箇所を確認できました。次は修正案を選びましょう。",
      stepperStep2Subtitle: "パスの組み立て方を見る",
    },
    progress: {
      attackedSummary: "公開ディレクトリ外のファイル読み取りを確認済み",
    },
    explanation:
      "path.join はパスを結合するだけで、../ を除去したり検証したりしません。" +
      "path.resolve で絶対パスに正規化してから、公開ディレクトリの絶対パスで始まるかどうかを確認する方法が確実です。" +
      "`replace('../', '')` のような単純な置換は、`....//` や URL エンコードで迂回できるため不十分です。" +
      "パストラバーサルは CVE でも毎年多く報告されており、ファイル名をそのまま信頼しないことが基本原則です。",
    hints: [
      "readme.txt を指定すると public/readme.txt が返ってきます。では ../../secret/flag.txt を渡したとき、path.join はどのパスを組み立てると思いますか？",
      "パスを文字列で操作するのではなく、まず path.resolve で絶対パスに変換してみましょう。変換後のパスが公開ディレクトリの中かどうかを文字列の前方一致で確認できます。",
      "startsWith(base + path.sep) という条件を使うと、base そのもの（ディレクトリ自体）へのアクセスも弾きながら、base/ の配下だけを許可できます。",
    ],
    initialCode: PATH_TRAVERSAL_INITIAL_CODE,
    patchOptions: [
      {
        id: "replace-traversal",
        title: "../ を文字列置換で削る",
        description:
          "req.query.name から ../ を除去しますが、....// のように入れ子にした文字列で迂回できます。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "-  const name = req.query.name;",
          "+  const name = req.query.name.replace(/\\.\\.\\/+/g, '');",
          "   const filePath = path.join(__dirname, 'public', name);",
        ].join("\n"),
        isCorrect: false,
      },
      {
        id: "resolve-and-check",
        title: "path.resolve で正規化して公開ディレクトリ外を弾く",
        description:
          "絶対パスに正規化してから公開ディレクトリ配下かどうかを確認する、推奨される安全な修正です。",
        patch: PATH_TRAVERSAL_SOLUTION_PATCH,
        isCorrect: true,
      },
      {
        id: "comment-warning",
        title: "コードにコメントで注意書きを追加する",
        description:
          "開発者への注意喚起にはなりますが、実行時に ../ を弾く処理は一切追加されません。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          " app.get('/download', (req, res) => {",
          "+  // TODO: name に ../ を渡さないよう呼び出し元で対処すること",
          "   const name = req.query.name;",
        ].join("\n"),
        isCorrect: false,
      },
    ],
  },

  "cmd-injection-ping": {
    id: "cmd-injection-ping",
    vulnerability: "Command Injection",
    title: "診断ツールのシェルを黙らせろ",
    shortDescription:
      "ping コマンドにユーザー入力を直接渡しているAPIを診断し、シェルメタ文字による任意コマンド実行を防ぐ修正を選びます。",
    scenario:
      "ネットワーク診断ツールの /ping エンドポイントは、受け取った host をそのままシェルコマンド文字列に埋め込んで実行している。" +
      "; や && などのメタ文字を混ぜると ping の後に任意のコマンドを追加実行できてしまう。" +
      "攻撃テストで動作を確認し、シェルを介さない形でコマンドを呼ぶ方向の修正を選ぼう。",
    vulnerableAppTitle: "Network Diagnostics / beta-0.1",
    targetEndpoint: "POST /ping",
    learnSummary:
      "コマンドインジェクションの原因と、execFile による引数分離での防御",
    attackGoal:
      "host フィールドに ; cat /etc/passwd のようなメタ文字を混ぜ、ping の後に別コマンドを実行させてその出力をレスポンスで受け取る。",
    causeSummary:
      "ユーザー入力をシェルコマンド文字列に直接結合しているため、シェルがメタ文字を解釈してしまいます。" +
      "exec ではなく execFile でホスト名を引数として渡し、ホワイトリスト正規表現で入力を検証する方向の修正を目指します。",
    attackPayload: "127.0.0.1; cat /etc/passwd",
    attackVerifiedMessage:
      "; の後に続けたコマンドの出力がレスポンスに含まれました",
    attackVerifyDisclaimer:
      "実際にシェルコマンドを実行したりはせず、学習用の疑似判定だけを表示します。",
    defenseSuccessFlavor:
      "シェルを介さず引数として渡すため、メタ文字が解釈されずコマンド追加実行を防げています。",
    defenseFailureFlavor:
      "まだ ; や && などのメタ文字でコマンドを追加実行できる可能性が残っています。",
    previewKind: "ping",
    liveViewMode: "interactive",
    stepCopy: {
      step1Description:
        "host に 127.0.0.1; cat /etc/passwd を渡した疑似攻撃を実行し、任意コマンドの出力が返ることを確認しましょう。",
      step2Description:
        "ping ハンドラの中で、host をシェルコマンド文字列に直接埋め込んでいる箇所を探します。",
      step3Description:
        "exec をやめて execFile で引数分離し、入力をホワイトリスト検証する方向の修正案を選びましょう。",
      step4Description:
        "メタ文字を含む host が 400 で弾かれるか、疑似判定で確認します。",
      focusBoxTitle: "見るポイント",
      focusBoxBody:
        "exec にテンプレートリテラルで host を埋め込んでいます。exec はコマンド全体をシェルに渡すため、; や && などのメタ文字がシェルの区切り文字として解釈されてしまいます。",
      nextActionAttacked:
        "次にコードを読み、host がシェルコマンドに直接埋め込まれている箇所を確認しましょう。",
      nextActionCodeReviewed:
        "exec でシェルを介している問題箇所を確認できました。次は修正案を選びましょう。",
      stepperStep2Subtitle: "コマンドの組み立て方を見る",
    },
    progress: {
      attackedSummary: "メタ文字による任意コマンド実行を確認済み",
    },
    explanation:
      "exec はコマンド全体を文字列としてシェルに渡すため、ユーザー入力にメタ文字が含まれるとシェルがそれを解釈してしまいます。" +
      "execFile はシェルを経由せず、コマンドと引数を配列で直接渡すため、メタ文字が解釈されません。" +
      "; だけを除去するような対症療法は && や | 、バッククォート、$() などの代替メタ文字で迂回でき、二重引用符で囲んでも \" や $() で突破されます。" +
      "ホワイトリスト正規表現(英数字・ドット・ハイフンのみ許可)と execFile の組み合わせが基本的かつ堅牢な対策です。",
    hints: [
      "host に 127.0.0.1; echo hello を渡すと、シェルは ping を実行した後に echo hello も実行します。なぜシェルが2つのコマンドだと判断できるのでしょうか？",
      "exec の代わりに execFile を使うと、第2引数に配列で引数を渡すためシェルが起動しません。シェルがなければ ; や && を解釈する主体がいなくなります。",
      "execFile に変えるだけでなく、受け取る host が英数字・ドット・ハイフンだけかどうかを事前にチェックすると、さらに安全になります。",
    ],
    initialCode: CMD_INJECTION_INITIAL_CODE,
    patchOptions: [
      {
        id: "escape-semicolon",
        title: "; だけを除去してから exec に渡す",
        description:
          "; を消しても、&& や | やバッククォートなど他のメタ文字でコマンド追加実行が可能です。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "   const { host } = req.body;",
          "-  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
          "+  const safeHost = host.replace(/;/g, '');",
          "+  exec(`ping -c 1 ${safeHost}`, (err, stdout, stderr) => {",
        ].join("\n"),
        isCorrect: false,
      },
      {
        id: "execfile-allowlist",
        title: "execFile で引数を分離してホワイトリスト検証する",
        description:
          "シェルを経由せず引数配列で渡し、英数字・ドット・ハイフン以外の入力を事前に弾く、推奨される安全な修正です。",
        patch: CMD_INJECTION_SOLUTION_PATCH,
        isCorrect: true,
      },
      {
        id: "double-quote-wrap",
        title: "ユーザー入力を二重引用符で囲む",
        description:
          "二重引用符の中でも \" や $() は解釈されるため、コマンドインジェクションを完全には防げません。",
        patch: [
          "--- a/src/server.js",
          "+++ b/src/server.js",
          "@@",
          "   const { host } = req.body;",
          '-  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {',
          '+  exec(`ping -c 1 "${host}"`, (err, stdout, stderr) => {',
        ].join("\n"),
        isCorrect: false,
      },
    ],
  },
};

export const problemOrder: ProblemId[] = [
  "sqli-login",
  "xss-comments",
  "idor-profile",
  "path-traversal-files",
  "cmd-injection-ping",
];

export function getProblemContent(id: string): ProblemContent | undefined {
  return (problemContent as Record<string, ProblemContent>)[id];
}
