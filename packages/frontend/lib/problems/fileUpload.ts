import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const multer = require('multer');",
  "const path = require('path');",
  "const fs = require('fs');",
  "",
  "const app = express();",
  "const uploadDir = path.join(__dirname, 'uploads');",
  "if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);",
  "",
  "const storage = multer.diskStorage({",
  "  destination: uploadDir,",
  "  filename: (_req, file, cb) => cb(null, file.originalname),",
  "});",
  "const upload = multer({ storage });",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE UPLOAD ENDPOINT",
  "// Accepts any file extension and serves uploads directly from /files with",
  "// Express's static middleware. An attacker can upload a .html (or .svg, .js)",
  "// file containing JavaScript and the browser will execute it when /files/X",
  "// is opened — same-origin XSS via stored file.",
  "app.post('/upload', upload.single('file'), (req, res) => {",
  "  if (!req.file) return res.status(400).json({ error: 'No file' });",
  "  res.json({ ok: true, path: `/files/${req.file.originalname}` });",
  "});",
  "",
  "app.use('/files', express.static(uploadDir));",
  "",
  "app.get('/uploads', (_req, res) => {",
  "  const files = fs.readdirSync(uploadDir);",
  "  res.json({ files });",
  "});",
  "",
  "app.post('/reset', (_req, res) => {",
  "  fs.readdirSync(uploadDir).forEach((f) => fs.unlinkSync(path.join(uploadDir, f)));",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`file-upload listening on ${PORT}`));",
].join("\n");

const SOLUTION_PATCH = [
  "--- a/src/server.js",
  "+++ b/src/server.js",
  "@@ -7,10 +7,20 @@",
  " const uploadDir = path.join(__dirname, 'uploads');",
  " if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);",
  "",
  "+const ALLOWED_EXTS = new Set(['.txt', '.png', '.jpg']);",
  "+",
  " const storage = multer.diskStorage({",
  "   destination: uploadDir,",
  "-  filename: (_req, file, cb) => cb(null, file.originalname),",
  "+  filename: (_req, file, cb) => {",
  "+    const safe = path.basename(file.originalname).replace(/[^A-Za-z0-9._-]/g, '_');",
  "+    cb(null, safe);",
  "+  },",
  " });",
  "-const upload = multer({ storage });",
  "+const upload = multer({",
  "+  storage,",
  "+  fileFilter: (_req, file, cb) => {",
  "+    cb(null, ALLOWED_EXTS.has(path.extname(file.originalname).toLowerCase()));",
  "+  },",
  "+});",
  "",
  " app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "@@ -21,6 +31,6 @@",
  " // file containing JavaScript and the browser will execute it when /files/X",
  " // is opened — same-origin XSS via stored file.",
  " app.post('/upload', upload.single('file'), (req, res) => {",
  "-  if (!req.file) return res.status(400).json({ error: 'No file' });",
  "+  if (!req.file) return res.status(400).json({ error: 'No file or disallowed extension' });",
  "   res.json({ ok: true, path: `/files/${req.file.originalname}` });",
  " });",
  "",
].join("\n") + "\n";

export const fileUpload: ProblemContent = {
  id: "file-upload",
  vulnerability: "Insecure File Upload",
  title: "ファイルアップローダーに .html を入れさせるな",
  shortDescription:
    "拡張子を検証していないファイルアップロードAPIを診断し、悪意のあるHTMLが配信・実行されない修正を選びます。",
  scenario:
    "ファイル共有ツールは、アップロードされたファイルを拡張子チェックなしで保存し、/files/<name> から Express の static で配信している。" +
    "攻撃者は malicious.html を上げて GET /files/malicious.html を踏ませることで、同一オリジン内で任意の JavaScript を実行できてしまう。" +
    "攻撃テストで .html がアップロード・実行できることを確認し、許可拡張子をホワイトリストで絞る方向の修正を選ぼう。",
  vulnerableAppTitle: "File Share / mvp-0.3",
  targetEndpoint: "POST /upload",
  learnSummary:
    "Insecure File Upload の原因と、拡張子ホワイトリストとファイル名サニタイズによる防御",
  attackGoal:
    "<script> を含む malicious.html をアップロードし、その後 GET /files/malicious.html を text/html として取得して、同一オリジン内で JavaScript を実行する状態を作る。",
  causeSummary:
    "multer の fileFilter を設定せず、ファイル名もそのまま使っているため、.html を含む任意拡張子がそのまま保存され、static で配信されています。" +
    "許可する拡張子をホワイトリスト化し、ファイル名もサニタイズする方向の修正を目指します。",
  attackPayload: "POST /upload malicious.html → GET /files/malicious.html (text/html で配信)",
  attackVerifiedMessage:
    "悪意のあるHTMLファイルがアップロード・実行可能な状態です",
  attackVerifyDisclaimer:
    "実際の脆弱アプリケーションに対して攻撃を実行し、防御を検証します。",
  defenseSuccessFlavor:
    ".html などの危険な拡張子を弾けており、JavaScript の実行経路を作らせません。",
  defenseFailureFlavor:
    "まだ .html などの拡張子をそのまま保存・配信できる状態です。",
  previewKind: "upload",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "malicious.html をアップロードし、その後 /files/malicious.html を取得して Content-Type が text/html で返ることを確認しましょう。",
    step2Description:
      "multer の設定で、fileFilter や filename のサニタイズが入っていない箇所を探します。",
    step3Description:
      "拡張子をホワイトリストで絞り、ファイル名もサニタイズする方向の修正案を選びましょう。",
    step4Description:
      ".html のアップロードが 400 で弾かれるか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "multer({ storage }) としか書かれておらず、fileFilter で拡張子を絞っていません。filename も file.originalname をそのまま使っているため、攻撃者が好きな名前で保存できます。",
    nextActionAttacked:
      "次にコードを読み、拡張子チェックとファイル名サニタイズが抜けている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "multer の設定にホワイトリストが無いことを確認できました。次は修正案を選びましょう。",
    stepperStep2Subtitle: "multer の設定を見る",
  },
  progress: {
    attackedSummary: "悪意のあるHTMLが配信・実行可能であることを確認済み",
  },
  explanation:
    "アップロードされたファイルを同じオリジンの URL から配信すると、HTML や SVG に仕込んだ JavaScript がアプリ本体と同じ権限で実行できてしまいます。" +
    "対策の基本は『許可する拡張子をホワイトリスト化する』『ファイル名をサニタイズして path traversal を防ぐ』『可能なら別オリジン(CDNなど)から配信する』の3点です。" +
    "拡張子のブラックリスト(.html だけ弾く等)は .htm や .svg、.xhtml など別の実行可能形式で迂回されるため、必ずホワイトリストで設計しましょう。",
  hints: [
    "拡張子チェックなしで保存し、express.static でそのまま配信したとき、ブラウザは .html ファイルをどう扱うと思いますか？",
    "multer には fileFilter というオプションがあり、許可する拡張子を絞り込めます。.txt / .png / .jpg のように『安全な拡張子だけ』を白リストで指定する形にしましょう。",
    "ファイル名側も file.originalname をそのまま使うと ../ や記号で危険なパスを作れます。path.basename と /[^A-Za-z0-9._-]/g 置換でサニタイズしておくと安全です。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "blacklist-html",
      title: ".html だけブラックリストで弾く",
      description:
        ".htm / .svg / .xhtml / .js など別の実行可能形式で迂回されるため、本質的な対策にはなりません。",
      patch: wrongPatch(
        INITIAL_CODE,
        "const upload = multer({ storage });",
        "const upload = multer({ storage, fileFilter: (_req, file, cb) => cb(null, !/\\.html$/i.test(file.originalname)) });",
      ),
      isCorrect: false,
    },
    {
      id: "whitelist-and-sanitize",
      title: "拡張子をホワイトリストし、ファイル名をサニタイズする",
      description:
        ".txt / .png / .jpg のみ受け付け、保存名から記号を除去する、推奨される安全な修正です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "rename-random",
      title: "保存名をランダムにするだけ",
      description:
        "ファイル名は安全になりますが、拡張子はそのままなので .html がブラウザで実行される問題は残ります。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  filename: (_req, file, cb) => cb(null, file.originalname),",
        "  filename: (_req, file, cb) => cb(null, Math.random().toString(36).slice(2) + '-' + file.originalname),",
      ),
      isCorrect: false,
    },
  ],
};
