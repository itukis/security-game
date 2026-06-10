import type { ProblemContent } from "./_shared";

const INITIAL_CODE = [
  "const express = require('express');",
  "const multer = require('multer');",
  "const path = require('path');",
  "const fs = require('fs');",
  "const { exec } = require('child_process');",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "const publicDir = path.join(__dirname, 'public');",
  "const secretDir = path.join(__dirname, 'secret');",
  "const uploadDir = path.join(__dirname, 'uploads');",
  "for (const dir of [publicDir, secretDir, uploadDir]) fs.mkdirSync(dir, { recursive: true });",
  "fs.writeFileSync(path.join(publicDir, 'readme.txt'), 'public readme');",
  "fs.writeFileSync(path.join(secretDir, 'flag.txt'), 'FLAG{review_file_workbench}');",
  "",
  "const storage = multer.diskStorage({",
  "  destination: uploadDir,",
  "  filename: (_req, file, cb) => cb(null, file.originalname),",
  "});",
  "const upload = multer({ storage });",
  "",
  "app.get('/health', (_req, res) => res.json({ status: 'ok' }));",
  "",
  "// VULNERABLE: path traversal can escape publicDir.",
  "app.get('/download', (req, res) => {",
  "  const name = req.query.name;",
  "  const filePath = path.join(publicDir, name);",
  "  fs.readFile(filePath, 'utf8', (err, data) => {",
  "    if (err) return res.status(404).send('File not found');",
  "    res.send(data);",
  "  });",
  "});",
  "",
  "// VULNERABLE: host is interpolated into a shell command.",
  "app.post('/ping', (req, res) => {",
  "  const { host } = req.body || {};",
  "  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
  "    res.json({ output: stdout || stderr || (err && err.message) });",
  "  });",
  "});",
  "",
  "// VULNERABLE: executable files are accepted and served from the app origin.",
  "app.post('/upload', upload.single('file'), (req, res) => {",
  "  if (!req.file) return res.status(400).json({ error: 'No file' });",
  "  res.json({ ok: true, path: `/files/${req.file.originalname}` });",
  "});",
  "",
  "app.use('/files', express.static(uploadDir));",
  "",
  "app.get('/uploads', (_req, res) => {",
  "  res.json({ files: fs.readdirSync(uploadDir) });",
  "});",
  "",
  "app.post('/reset', (_req, res) => {",
  "  fs.readdirSync(uploadDir).forEach((file) => fs.unlinkSync(path.join(uploadDir, file)));",
  "  res.json({ ok: true });",
  "});",
  "",
  "const PORT = process.env.PORT || 3000;",
  "app.listen(PORT, '0.0.0.0', () => console.log(`review-file-workbench listening on ${PORT}`));",
].join("\n");

export const reviewFileWorkbench: ProblemContent = {
  id: "review-file-workbench",
  vulnerability: "Composite Review",
  difficulty: "Hard",
  title: "ファイル作業台の危険な入出力を片付けろ",
  shortDescription:
    "Path Traversal、Command Injection、Insecure File Upload を1つのファイル操作ツールでまとめて修正します。",
  scenario:
    "社内のファイル作業台には、公開ファイルダウンロード、疎通確認、ファイルアップロードが同居しています。どれも入力を信頼しすぎており、非公開ファイル読み取り、任意コマンド実行、同一オリジンXSSにつながります。3つの入出力経路をすべて堅くしてください。",
  vulnerableAppTitle: "File Workbench / review-3",
  targetEndpoint: "GET /download + POST /ping + POST /upload",
  learnSummary:
    "パス正規化、シェルを介さない実行、アップロード拡張子ホワイトリストの組み合わせ",
  attackGoal:
    "../ で secret/flag.txt を読み、host にシェルメタ文字を混ぜ、malicious.html をアップロードして配信させる。",
  causeSummary:
    "ファイルパス、シェルコマンド、アップロードファイル名/拡張子という危険な境界で入力検証が不足しています。正規化後の配下チェック、execFile、拡張子ホワイトリストと保存名サニタイズを組み合わせます。",
  attackPayload:
    "../secret/flag.txt / 127.0.0.1; echo PWNED / malicious.html",
  attackVerifiedMessage:
    "Path Traversal、Command Injection、危険なファイルアップロードの少なくとも1つが成立しました",
  attackVerifyDisclaimer:
    "複合攻撃を実行し、3つのファイル系リスクがすべて塞がれているかを検証します。",
  defenseSuccessFlavor:
    "公開ディレクトリ外の読み取り、シェルメタ文字、危険拡張子のアップロードがすべて止まっています。",
  defenseFailureFlavor:
    "まだファイル操作、コマンド実行、アップロードのいずれかに危険な入力が通ります。",
  previewKind: "fileWorkbench",
  liveViewMode: "interactive",
  stepCopy: {
    step1Description:
      "プレビューまたは自動攻撃で、../ 読み取り・シェルメタ文字・malicious.html アップロードを確認しましょう。",
    step2Description:
      "download、ping、upload の3つのハンドラで入力がどこへ渡るか追います。",
    step3Description:
      "path.resolve による配下チェック、execFile とホスト名検証、拡張子ホワイトリストと保存名サニタイズを実装してください。",
    step4Description:
      "3つの攻撃がすべて失敗するか、再テストで確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "ファイルパスは文字列置換ではなく正規化後に配下確認、コマンドはシェル文字列ではなく引数配列、アップロードはブラックリストではなくホワイトリストが基本です。",
    nextActionAttacked:
      "次にコードを読み、ファイル名・host・アップロード名が危険な処理へ直接渡る箇所を確認しましょう。",
    nextActionCodeReviewed:
      "3つの入出力経路を確認できました。次はコードを直接修正しましょう。",
    stepperStep2Subtitle: "危険な入出力を見る",
  },
  progress: {
    attackedSummary: "Path Traversal / Command Injection / File Upload の複合攻撃を確認済み",
  },
  explanation:
    "ファイル操作では path.resolve 後に許可ディレクトリ配下か確認し、コマンド実行では execFile で引数分離し、アップロードでは安全な拡張子だけ許可して保存名をサニタイズします。危険文字の個別除去や .html だけの拒否は迂回されやすいため不十分です。",
  hints: [
    "download は `path.join` の前ではなく、`path.resolve` の後に publicDir 配下か確認してください。",
    "ping は `exec` の文字列を続けるのではなく、`execFile('ping', ['-c', '1', host])` の形に変えてください。",
    "upload は `.html` だけ拒否するのではなく、許可拡張子を Set で定義し、`path.basename` と置換で保存名を安全にしてください。",
  ],
  initialCode: INITIAL_CODE,
  patchOptions: [],
};
