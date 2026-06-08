import type {
  PatchOption,
  ProblemPresentation,
  VulnerabilityType,
} from "@/lib/challengeTypes";

// Static, per-problem content. Single source of truth for all 3 missions.
// Loaded by both mock mode (mockChallenges) and real API mode
// (mapProblemToChallenge in lib/api/challenges) so the UI never carries
// vulnerability-specific copy hard-coded into components.
//
// The "correct" patch text mirrors each app's solution.patch on disk so
// that USE_MOCK=false sends a unified diff the orchestrator will accept.
// Wrong options are intentionally illustrative and will either fail to
// apply or fail the post-patch attack — both surface as "防御失敗" in UI.

export type ProblemId = "sqli-login" | "xss-comments" | "idor-profile";

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
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "// VULNERABLE LOGIN ENDPOINT",
  "// User input is concatenated directly into the SQL query.",
  "app.post('/login', (req, res) => {",
  "  const { username, password } = req.body;",
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
].join("\n");

const XSS_INITIAL_CODE = [
  "const express = require('express');",
  "const app = express();",
  "app.use(express.json());",
  "",
  "const comments = [];",
  "let nextId = 1;",
  "",
  "app.post('/comments', (req, res) => {",
  "  const { author, text } = req.body || {};",
  "  comments.push({ id: nextId++, author, text });",
  "  res.json({ ok: true });",
  "});",
  "",
  "// VULNERABLE RENDER ENDPOINT",
  "// Comments are concatenated straight into HTML without escaping.",
  "app.get('/comments', (req, res) => {",
  "  res.setHeader('Content-Type', 'text/html');",
  "",
  "  const rendered = comments",
  "    .map((c) => `<div class=\"comment\"><b>${c.author}</b>: ${c.text}</div>`)",
  "    .join('\\n');",
  "",
  "  res.send(`<!doctype html><html><body>${rendered}</body></html>`);",
  "});",
].join("\n");

const IDOR_INITIAL_CODE = [
  "const express = require('express');",
  "const app = express();",
  "app.use(express.json());",
  "",
  "// Mock session: who is logged in is read from a header.",
  "app.use((req, _res, next) => {",
  "  req.userId = req.headers['x-user-id'] || 'user-1';",
  "  next();",
  "});",
  "",
  "const PROFILES = {",
  "  'user-1': { id: 'user-1', name: 'Alice', secret: 'public bio' },",
  "  'user-2': { id: 'user-2', name: 'Bob',   secret: 'CONFIDENTIAL: launch codes' },",
  "  'user-3': { id: 'user-3', name: 'Carol', secret: 'CONFIDENTIAL: bank PIN 4823' },",
  "};",
  "",
  "// VULNERABLE PROFILE ENDPOINT",
  "// Returns profile by URL :id without checking the authenticated user.",
  "app.get('/profile/:id', (req, res) => {",
  "  const profile = PROFILES[req.params.id];",
  "  if (!profile) return res.status(404).json({ error: 'Profile not found' });",
  "  res.json(profile);",
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
};

export const problemOrder: ProblemId[] = [
  "sqli-login",
  "xss-comments",
  "idor-profile",
];

export function getProblemContent(id: string): ProblemContent | undefined {
  return (problemContent as Record<string, ProblemContent>)[id];
}
