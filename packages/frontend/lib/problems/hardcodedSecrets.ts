import { solutionPatch, wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const app = express();",
  "",
  "const ADMIN_API_KEY = 'sk-secret-admin-key-12345';",
  "const DATA = { public: 'This is public info', secret: 'TOP SECRET: merger plan Q3' };",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE DASHBOARD ENDPOINT",
  "// The admin API key is embedded directly in the HTML the server returns to",
  "// the browser. Anyone who opens DevTools (or simply views source) can read",
  "// it and then call /api/data themselves as admin.",
  "app.get('/', (_req, res) => {",
  "  res.send(`<!doctype html>",
  "<html><head><title>Dashboard</title></head>",
  "<body>",
  "  <h1>Dashboard</h1>",
  "  <p id=\"data\"></p>",
  "  <script>",
  "    const API_KEY = '${ADMIN_API_KEY}';",
  "    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
  "      .then(r => r.json())",
  "      .then(d => document.getElementById('data').textContent = d.public);",
  "  </script>",
  "</body></html>`);",
  "});",
  "",
  "app.get('/api/data', (req, res) => {",
  "  const auth = req.headers.authorization;",
  "  if (auth === `Bearer ${ADMIN_API_KEY}`) {",
  "    return res.json(DATA);",
  "  }",
  "  res.status(401).json({ error: 'Unauthorized' });",
  "});",
  "",
  "app.post('/reset', (_req, res) => res.json({ ok: true }));",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`hardcoded-secrets listening on ${PORT}`));",
].join("\n");

const SOLUTION_PATCH = solutionPatch(
  INITIAL_CODE,
  [
    "    const API_KEY = '${ADMIN_API_KEY}';\n    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
    "    fetch('/api/data-proxy')",
  ],
  [
    "app.get('/api/data', (req, res) => {",
    "app.get('/api/data-proxy', (_req, res) => {\n  res.json({ public: DATA.public });\n});\n\napp.get('/api/data', (req, res) => {",
  ],
);

export const hardcodedSecrets: ProblemContent = {
  id: "hardcoded-secrets",
  vulnerability: "Information Exposure",
  title: "ダッシュボードから管理者キーを取り除け",
  shortDescription:
    "管理者APIキーをHTMLに直接埋め込んでいるダッシュボードを診断し、サーバー側で隠すコードへ修正します。",
  scenario:
    "管理ダッシュボードは、内部APIを呼ぶための管理者キーをそのままHTMLに埋め込んでブラウザへ返している。" +
    "DevTools を開いた誰でもキーを読み取れ、その後は管理者として /api/data を直接呼べてしまう。" +
    "攻撃テストで HTML 内にキーが露出していることを確認し、サーバー側プロキシで隠す方向へコードを修正しよう。",
  vulnerableAppTitle: "Admin Dashboard / mvp-0.3",
  targetEndpoint: "GET /",
  learnSummary:
    "ハードコードされた秘密情報の露出と、サーバー側プロキシによる防御",
  attackGoal:
    "ダッシュボードページのHTMLソースから ADMIN_API_KEY を読み取り、その鍵を使って /api/data に直接アクセスして TOP SECRET を取り出す。",
  causeSummary:
    "ブラウザに送るHTMLに API キーを直接埋め込んでいるため、ソースを見るだけで誰でも鍵を取り出せます。" +
    "ブラウザに鍵を渡さず、サーバー側のプロキシエンドポイント越しに必要な情報だけを返す方向の修正を目指します。",
  attackPayload: "GET / → HTMLソース内に sk-secret-admin-key-12345 が露出",
  attackVerifiedMessage:
    "HTMLソースにAPIキーが埋め込まれています — DevToolsで誰でも読めます",
  attackVerifyDisclaimer:
    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
  defenseSuccessFlavor:
    "HTMLからAPIキーが消え、ブラウザからは内部APIを直接呼べなくなっています。",
  defenseFailureFlavor:
    "まだHTMLソースを見ればAPIキーが取り出せる状態です。",
  previewKind: "dashboard",
  liveViewMode: "iframe",
  stepCopy: {
    step1Description:
      "ダッシュボードページを開き、View Source で sk-secret… の文字列が含まれていることを確認しましょう。",
    step2Description:
      "GET / のテンプレート文字列に API_KEY が直接埋め込まれている箇所を探します。",
    step3Description:
      "クライアントには鍵を渡さず、サーバー側プロキシ越しに公開フィールドだけ返す方向へコードを修正しましょう。",
    step4Description:
      "HTMLソースから API_KEY 関連の文字列が消えるか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "テンプレートリテラル内に const API_KEY = '${ADMIN_API_KEY}' と書かれ、ブラウザに送るHTMLにそのまま埋め込まれています。",
    nextActionAttacked:
      "次にコードを読み、HTMLに直接埋め込まれている API_KEY を確認しましょう。",
    nextActionCodeReviewed:
      "HTMLにキーが埋め込まれている箇所を確認できました。次はコードを修正しましょう。",
    stepperStep2Subtitle: "クライアントに何が渡っているか見る",
  },
  progress: {
    attackedSummary: "HTMLソースに管理者APIキーが露出することを確認済み",
  },
  explanation:
    "ブラウザに届く全てのコード・データは秘密情報ではなく『公開情報』と考えるのが原則です。" +
    "API キーや認証トークンなど、サーバーだけで使うべきものをクライアント側に渡してしまうと、DevTools・View Source・ネットワークタブの全てから読み取れてしまいます。" +
    "クライアントが必要とするデータは、サーバー側のプロキシエンドポイントを経由して、認可済みかつ必要最小限のフィールドだけを返す形にしましょう。",
  hints: [
    "ブラウザの View Source でページを開き、長い 'sk-' で始まる文字列が含まれていないか探してみてください。",
    "秘密にしたいキーが「ブラウザに届くHTML/JS」に含まれていたら、それはもう秘密ではありません。サーバー側のエンドポイント越しに呼ぶ形に変えましょう。",
    "GET /api/data-proxy のようなサーバー側エンドポイントを足し、その中で内部APIを呼んで非機密フィールドだけ返す形に書き換えてみましょう。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "rename-constant",
      title: "クライアント側の変数名を短くする",
      description:
        "`const _k = 'sk-...'` のように、ブラウザへ渡るJavaScript内の名前だけを変える案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const API_KEY = '${ADMIN_API_KEY}';",
        "    const _k = '${ADMIN_API_KEY}';",
      ),
      isCorrect: false,
    },
    {
      id: "server-side-proxy",
      title: "ブラウザから鍵を直接見せない経路にする",
      description:
        "`fetch('/api/data-proxy')` へ切り替え、内部APIキーを使う処理をサーバー側のハンドラへ移す案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "comment-out-key",
      title: "鍵の近くにTODOコメントを足す",
      description:
        "`// TODO: 本番では環境変数化する` のように、将来の修正メモをコードへ残す案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const API_KEY = '${ADMIN_API_KEY}';",
        "    // TODO: 本番では環境変数化する\n    const API_KEY = '${ADMIN_API_KEY}';",
      ),
      isCorrect: false,
    },
    {
      id: "base64-key",
      title: "Base64 でエンコードして埋め込む",
      description:
        "`Buffer.from(ADMIN_API_KEY).toString('base64')` をHTMLに埋め込み、クライアントで `atob` してから使う案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const API_KEY = '${ADMIN_API_KEY}';\n    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
        "    const API_KEY = atob('${Buffer.from(ADMIN_API_KEY).toString('base64')}');\n    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
      ),
      isCorrect: false,
    },
    {
      id: "block-devtools",
      title: "ブラウザの右クリックだけ無効化する",
      description:
        "`document.addEventListener('contextmenu', e => e.preventDefault())` で右クリックを無効化する案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const API_KEY = '${ADMIN_API_KEY}';\n    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
        "    document.addEventListener('contextmenu', e => e.preventDefault());\n    const API_KEY = '${ADMIN_API_KEY}';\n    fetch('/api/data', { headers: { 'Authorization': 'Bearer ' + API_KEY } })",
      ),
      isCorrect: false,
    },
  ],
};
