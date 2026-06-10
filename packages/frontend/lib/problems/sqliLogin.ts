import { wrongPatch, type ProblemContent } from "./_shared";

const INITIAL_CODE = [
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

const SOLUTION_PATCH = [
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

export const sqliLogin: ProblemContent = {
  id: "sqli-login",
  vulnerability: "SQL Injection",
  title: "AIが生成したログイン画面を診断せよ",
  shortDescription:
    "AIで生成されたログイン画面にあるSQLインジェクションを見つけ、認証突破を防ぐコードへ修正します。",
  scenario:
    "AIで生成されたログイン画面に、SQLインジェクションでログイン認証が突破される弱点が含まれている。攻撃テストを実行し、原因コードを確認して、コードを直接修正する。",
  vulnerableAppTitle: "AI Generated Login / beta-0.3",
  targetEndpoint: "POST /login",
  learnSummary:
    "SQLインジェクションの原因と、プリペアドステートメントによる防御",
  attackGoal:
    "ユーザー名やパスワード欄に SQL の構文を混ぜ込み、本来通らない条件で認証を成立させる。",
  causeSummary:
    "入力値をSQL文字列へ直接結合していることが原因です。プリペアドステートメントで入力値をSQL構文ではなく値として扱う修正を目指します。",
  attackPayload: "' OR 1=1--",
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
      "プリペアドステートメントなど、入力値をSQL構文ではなく値として扱うコードへ修正しましょう。",
    step4Description:
      "編集したコードでSQLインジェクションを防げるか、学習用の疑似判定で確認します。",
    focusBoxTitle: "見るポイント",
    focusBoxBody:
      "入力値をSQL文字列へ直接結合していることが原因です。この形だと、入力値がSQL構文として扱われる可能性があります。",
    nextActionAttacked:
      "次にコードを読み、原因になっているSQLの組み立て方を確認しましょう。",
    nextActionCodeReviewed:
      "入力値をSQL文字列に直接結合している原因を確認できました。次はコードを修正しましょう。",
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
  initialCode: INITIAL_CODE,
  patchOptions: [
    {
      id: "raw-sql-trim",
      title: "実行前にSQL文字列を整える",
      description:
        "`db.prepare(sql.trim()).get()` のように、組み立て済みSQLへ前処理を入れる案です。引用符入りの入力がどう扱われるか見比べてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const row = db.prepare(sql).get();",
        "    const row = db.prepare(sql.trim()).get();",
      ),
      isCorrect: false,
    },
    {
      id: "prepared-statement",
      title: "SQL本文と入力値の渡し方を分ける",
      description:
        "`WHERE username = ? AND password = ?` のような形にし、`get(username, password)` で値を後から渡す案です。",
      patch: SOLUTION_PATCH,
      isCorrect: true,
    },
    {
      id: "hide-password",
      title: "失敗時レスポンスを少し変える",
      description:
        "`res.json({ success: false, hint: 'try again' })` のように、レスポンス側だけを変える案です。",
      patch: wrongPatch(
        INITIAL_CODE,
        "      res.json({ success: false });",
        "      res.json({ success: false, hint: 'try again' });",
      ),
      isCorrect: false,
    },
    {
      id: "limit-input-length",
      title: "入力の長さだけを制限する",
      description:
        "`if (username.length > 32 || password.length > 32) ...` のように、文字数だけを縛る案です。短いペイロードでも刺さるか考えてみてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "  if (!username || !password) {\n    return res.status(400).json({ success: false, error: 'Missing username or password' });\n  }",
        "  if (!username || !password) {\n    return res.status(400).json({ success: false, error: 'Missing username or password' });\n  }\n  if (username.length > 32 || password.length > 32) {\n    return res.status(400).json({ success: false, error: 'Too long' });\n  }",
      ),
      isCorrect: false,
    },
    {
      id: "strip-quotes",
      title: "シングルクォートだけを取り除く",
      description:
        "`username.replace(/'/g, '')` のように、危険そうな1文字だけを削る案です。SQL構文を成立させる他の手段がないか考えてみてください。",
      patch: wrongPatch(
        INITIAL_CODE,
        "    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
        "    const sql = `SELECT * FROM users WHERE username = '${username.replace(/'/g, '')}' AND password = '${password.replace(/'/g, '')}'`;",
      ),
      isCorrect: false,
    },
  ],
};
