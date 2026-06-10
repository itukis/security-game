import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
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

const SOLUTION_PATCH = [
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

export const idorProfile: ProblemContent = {
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
  attackPayload: "user-2",
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
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "log-access",
      title: "アクセスログを出す",
      description:
        "誰が誰のプロフィールを見たか記録するだけで、覗き見そのものは止められません。",
      patch: wrongPatch(
        INITIAL_CODE,
        "app.get('/profile/:id', (req, res) => {\n  const profile = PROFILES[req.params.id];",
        "app.get('/profile/:id', (req, res) => {\n  console.log('profile read', req.userId, '->', req.params.id);\n  const profile = PROFILES[req.params.id];",
      ),
      isCorrect: false,
    },
    {
      id: "authz-check",
      title: "ハンドラ先頭で本人確認して 403 を返す",
      description:
        "req.userId と req.params.id が違うときは、プロフィールを引く前に 403 Forbidden を返します。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "hide-secret-field",
      title: "secret フィールドだけ返さない",
      description:
        "一部の項目を隠すだけで、他人の名前やメールは依然として取れてしまいます。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  res.json(profile);",
        "  const { secret: _secret, ...safe } = profile;\n  res.json(safe);",
      ),
      isCorrect: false,
    },
  ],
};
