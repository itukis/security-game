import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
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

const SOLUTION_PATCH = [
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

export const cmdInjectionPing: ProblemContent = {
  id: "cmd-injection-ping",
  vulnerability: "Command Injection",
  title: "診断ツールのシェルを黙らせろ",
  shortDescription:
    "ping コマンドにユーザー入力を直接渡しているAPIを診断し、シェルメタ文字による任意コマンド実行を防ぐコードへ修正します。",
  scenario:
    "ネットワーク診断ツールの /ping エンドポイントは、受け取った host をそのままシェルコマンド文字列に埋め込んで実行している。" +
    "; や && などのメタ文字を混ぜると ping の後に任意のコマンドを追加実行できてしまう。" +
    "攻撃テストで動作を確認し、シェルを介さない形でコマンドを呼ぶ方向へコードを修正しよう。",
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
      "exec をやめて execFile で引数分離し、入力をホワイトリスト検証する方向へコードを修正しましょう。",
    step4Description:
      "メタ文字を含む host が 400 で弾かれるか、疑似判定で確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "exec にテンプレートリテラルで host を埋め込んでいます。exec はコマンド全体をシェルに渡すため、; や && などのメタ文字がシェルの区切り文字として解釈されてしまいます。",
    nextActionAttacked:
      "次にコードを読み、host がシェルコマンドに直接埋め込まれている箇所を確認しましょう。",
    nextActionCodeReviewed:
      "exec でシェルを介している問題箇所を確認できました。次はコードを修正しましょう。",
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
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "escape-semicolon",
      title: "一部の区切り文字を消してから渡す",
      description:
        "`host.replace(/;/g, '')` のように、特定のシェル記号だけを取り除く案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  const { host } = req.body;\n  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
        "  const { host } = req.body;\n  const safeHost = host.replace(/;/g, '');\n  exec(`ping -c 1 ${safeHost}`, (err, stdout, stderr) => {",
      ),
      isCorrect: false,
    },
    {
      id: "execfile-allowlist",
      title: "コマンド名と引数を分けて渡す",
      description:
        "`execFile('ping', ['-c', '1', host])` のように、シェル文字列ではなく引数配列として渡す案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "double-quote-wrap",
      title: "入力値を引用符で囲む",
      description:
        "`exec(\\`ping -c 1 \"${host}\"\\`)` のように、既存のシェル文字列の中で入力を囲む案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
        '  exec(`ping -c 1 "${host}"`, (err, stdout, stderr) => {',
      ),
      isCorrect: false,
    },
    {
      id: "timeout-only",
      title: "実行時間に上限を付ける",
      description:
        "`exec(..., { timeout: 2000 })` でコマンドを時間制限する案です。短時間で完了するコマンドでも刺さるか考えてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {",
        "  exec(`ping -c 1 ${host}`, { timeout: 2000 }, (err, stdout, stderr) => {",
      ),
      isCorrect: false,
    },
    {
      id: "filter-output",
      title: "レスポンスから機密情報を伏字にする",
      description:
        "`stdout.replace(/root|passwd/g, '***')` のように、出力側から特定語を消す案です。出力以外の経路で被害が出ないか考えてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    res.json({ output: stdout || stderr });",
        "    const safe = (stdout || stderr || '').replace(/root|passwd|shadow/g, '***');\n    res.json({ output: safe });",
      ),
      isCorrect: false,
    },
  ],
};
