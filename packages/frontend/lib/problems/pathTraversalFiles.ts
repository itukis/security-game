import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
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

const SOLUTION_PATCH = [
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

export const pathTraversalFiles: ProblemContent = {
  id: "path-traversal-files",
  vulnerability: "Path Traversal",
  title: "公開ダウンローダーから ../ を締め出せ",
  shortDescription:
    "ファイル名をそのままパスに結合しているダウンロードAPIを診断し、公開ディレクトリの外を読めなくするコードへ修正します。",
  scenario:
    "社内ツールの公開ファイルダウンローダーは、クエリパラメータで受け取ったファイル名をそのまま public/ ディレクトリに結合して返している。" +
    "名前に ../ を混ぜると想定外のディレクトリへ脱出でき、非公開ファイルまで読み取れてしまう。" +
    "攻撃テストで動作を確認し、パスを正規化して公開ディレクトリ内に限定するコードへ修正しよう。",
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
      "パスを正規化して公開ディレクトリ内に限定する方向へコードを修正しましょう。",
    step4Description:
      "../ を含むリクエストが 400 で弾かれるか、疑似判定で確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "req.query.name をそのまま path.join に渡しています。path.join は ../ を解釈して上位ディレクトリへ移動するため、公開ディレクトリの外に出てしまいます。",
    nextActionAttacked:
      "次にコードを読み、ファイル名の検証が抜けている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "path.join に無検証で渡している箇所を確認できました。次はコードを修正しましょう。",
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
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "replace-traversal",
      title: "危険そうな部分文字列を削る",
      description:
        "`req.query.name.replace(/\\.\\.\\/+/g, '')` のように、入力文字列から一部パターンを消す案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const name = req.query.name;",
        "  const name = req.query.name.replace(/\\.\\.\\/+/g, '');",
      ),
      isCorrect: false,
    },
    {
      id: "resolve-and-check",
      title: "組み立て後の絶対パスを確認する",
      description:
        "`path.resolve(PUBLIC_DIR, name)` の結果が `PUBLIC_DIR` 配下にあるかを、読み込み前に確認する案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "comment-warning",
      title: "呼び出し側への注意をコメントに残す",
      description:
        "`// TODO: name に ../ を渡さない` のように、実装上の注意を書き足す案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "app.get('/download', (req, res) => {\n  const name = req.query.name;",
        "app.get('/download', (req, res) => {\n  // TODO: name に ../ を渡さないよう呼び出し元で対処すること\n  const name = req.query.name;",
      ),
      isCorrect: false,
    },
  ],
};
