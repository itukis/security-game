# SecurePatch Quest 実装アーキテクチャ

この文書は、現在の実装ツリーをもとにしたアプリケーション構造のまとめです。
既存の `docs/ARCHITECTURE.md` が全体像と検証サイクル中心なのに対し、この文書では
「どのパッケージ・コンポーネント・関数が何をしているか」を追いやすい粒度で整理します。

## 全体像

SecurePatch Quest は、脆弱な小規模アプリケーションを攻撃で確認し、コードを修正して、攻撃が防げたかを検証するセキュリティ学習ゲームです。

実装は monorepo 風の構成で、中心は次の 5 つです。

| 領域 | 主な場所 | 役割 |
|---|---|---|
| フロントエンド | `packages/frontend` | Next.js App Router。問題一覧、学習フロー、コード表示/編集、プレビュー、認証 UI を提供する。 |
| Orchestrator API | `packages/orchestrator` | Express API。問題メタデータの提供、パッチ検証、Docker コンテナ操作、スコア記録を担当する。 |
| Attack engine | `packages/attack-engine` | 脆弱アプリに対して SQLi/XSS/認可バイパスの攻撃リクエストを実行する。 |
| Vulnerable apps | `packages/vulnerable-apps` | Docker 上で動く意図的に脆弱な Express アプリ。現在は 3 つが実コンテナ化されている。 |
| Supabase | `supabase` | Auth、プロフィール、提出履歴、クリア情報、ランキング用の DB スキーマを持つ。 |

補足: ルート直下の `frontend/` は少数の旧/重複ファイルのみで、実際の Next.js パッケージは `packages/frontend` です。

## 実行時構成

```text
Browser
  |
  | http://localhost:3000
  v
packages/frontend (Next.js)
  |  GET /problems/:id
  |  POST /problems/:id/verify
  |  PATCH /problems/:id/preview
  |  GET /me/dashboard
  |  GET /leaderboard
  v
packages/orchestrator (Express, http://localhost:4000)
  |                         |
  | docker compose / docker | require("../../attack-engine/src/runner")
  v                         v
Docker containers           packages/attack-engine
  - arena-sqli-login:3001     - sqli
  - arena-xss-comments:3002   - xss
  - arena-idor-profile:3003   - auth-bypass

External:
  Supabase Auth + Postgres
```

### ポート

| サービス | ポート | 備考 |
|---|---:|---|
| Next.js frontend | 3000 | `packages/frontend` の `npm run dev`。 |
| Orchestrator API | 4000 | `packages/orchestrator/src/server.js`。 |
| SQLi vulnerable app | 3001 | container 内は 3000。 |
| XSS vulnerable app | 3002 | container 内は 3000。 |
| IDOR vulnerable app | 3003 | container 内は 3000。 |

## リポジトリ構成

```text
security-game/
├── docker-compose.yml
├── docs/
├── packages/
│   ├── frontend/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── orchestrator/
│   │   ├── src/
│   │   └── scripts/
│   ├── attack-engine/
│   │   └── src/
│   └── vulnerable-apps/
│       ├── sqli-login/
│       ├── xss-comments/
│       └── idor-profile/
├── scripts/
└── supabase/
```

## 主要フロー

### 1. 問題一覧を表示する

1. `packages/frontend/app/challenges/page.tsx` が `getProblems()` を呼ぶ。
2. `packages/frontend/lib/api/challenges.ts` が `problemOrder` に従って各問題を取得する。
3. `NEXT_PUBLIC_USE_MOCK=true` の場合は `mockChallenges` だけを使う。
4. 実 API モードでは orchestrator の `GET /problems/:id` を呼び、返ってきた問題メタデータと `problemContent.ts` の日本語教材コンテンツを `mapProblemToChallenge()` でマージする。
5. `ChallengeCard` がカード表示する。

現在 `problemContent.ts` には 5 問分の教材コンテンツがあります。

| 問題 ID | 実コンテナ | 備考 |
|---|---|---|
| `sqli-login` | あり | SQL Injection。 |
| `xss-comments` | あり | XSS。 |
| `idor-profile` | あり | IDOR/認可バイパス。 |
| `path-traversal-files` | なし | フロントエンド上の静的/mock 問題。 |
| `cmd-injection-ping` | なし | フロントエンド上の静的/mock 問題。 |

### 2. 問題詳細を表示する

1. `app/challenges/[id]/page.tsx` が `getProblem(id)` を呼ぶ。
2. 問題がなければ `notFound()`。
3. 見つかれば `ChallengePlayground` に `Challenge` を渡す。
4. 画面下部に `GlossaryPanel` を表示する。

このページは Server Component で問題を取得し、学習フロー本体の `ChallengePlayground` は Client Component です。

### 3. 学習フローを進める

`ChallengePlayground` は 4 ステップの状態機械として動きます。

```text
Step 1: 攻撃テスト
  -> Step 2: 原因コードを確認
    -> Step 3: 修正案を選択、またはコードを編集
      -> Step 4: 再テスト結果
```

主な状態は次の通りです。

| 状態 | 型 | 意味 |
|---|---|---|
| `attackState` | `"idle" \| "running" \| "success" \| "failure"` | 攻撃テストを確認したか。 |
| `codeReviewed` | `boolean` | ユーザーが原因コードを確認したか。 |
| `defenseState` | `"idle" \| "checking" \| "success" \| "failure" \| "error"` | 修正後の検証状態。 |
| `selectedPatchId` | `string \| null` | 選択式モードで選んだパッチ。 |
| `editorCode` | `string` | エディタモードでユーザーが編集しているコード。 |
| `previewApplyState` | `"idle" \| "applying" \| "applied" \| "error"` | 編集内容をプレビュー用コンテナへ反映した状態。 |

`getQuestUiStatus()`、`getCurrentStep()`、`getCompletedSteps()` がこれらの状態から画面ステップを導出します。

### 4. パッチを検証する

選択式モードでは `patchOptions` の unified diff をそのまま使います。
エディタモードでは `makePatch("src/server.js", original, modified)` で unified diff を生成します。

```text
ChallengePlayground
  -> verifyPatch(id, patch)
    -> POST http://localhost:4000/problems/:id/verify
      -> validatePatchRequest()
      -> enqueueContainerMutation()
      -> verify()
        -> resetProblemContainer()
        -> runAttack() baseline
        -> applyPatch()
        -> runAttack() patched
        -> passed 判定
      -> recordSubmission() if authenticated
```

orchestrator の `verify()` は、共有 Docker 状態を安全に扱うため `enqueueContainerMutation()` で直列化されています。

検証結果は次の形です。

```json
{
  "attackBefore": {
    "vulnerability": "sqli",
    "exploited": true,
    "payload": "' OR '1'='1",
    "evidence": "Payload returned success:true ...",
    "durationMs": 123
  },
  "attackAfter": {
    "vulnerability": "sqli",
    "exploited": false,
    "payload": null,
    "evidence": "All payloads were rejected ...",
    "durationMs": 98
  },
  "passed": true
}
```

ログイン済みの場合は、追加で `recording` と `appliedPatchSummary` が返ります。

### 5. ライブプレビューに反映する

エディタ+プレビューモードでは、検証前に現在の編集内容を live container に反映できます。

```text
ChallengePlayground.handlePreviewApply()
  -> previewApplyPatch(id, patch)
    -> PATCH /problems/:id/preview
      -> resetProblemContainer(id)
      -> applyPatch({ problemId, patchString })
  -> refreshPreviewAfterPatch()
```

`xss-comments` は HTML 表示を iframe で確認しやすいため、反映後に攻撃コメントを自動投稿して iframe を再読み込みします。
`sqli-login` と `idor-profile` は JSON API が中心なので、フォーム型の `VulnerableAppPreview` で再テストします。

## フロントエンド実装

### App Router

| ファイル | 役割 |
|---|---|
| `app/layout.tsx` | HTML ルート。Geist フォント、`AuthProvider`、`ToastProvider`、グローバル CSS を設定する。 |
| `app/page.tsx` | ホーム画面。アプリ説明と `/challenges` への導線を表示する。 |
| `app/challenges/page.tsx` | 問題一覧。`getProblems()` で問題を取得し、`ChallengeCard` に渡す。 |
| `app/challenges/[id]/page.tsx` | 問題詳細。`ChallengePlayground` と `GlossaryPanel` を表示する。 |
| `app/login/page.tsx` | Supabase Auth のログイン画面。成功後 `/dashboard` へ遷移する。 |
| `app/signup/page.tsx` | Supabase Auth のサインアップ画面。パスワード確認もここで行う。 |
| `app/dashboard/page.tsx` | ログインユーザーのスコア、クリア済み問題、最近の提出を表示する。 |
| `app/profile/page.tsx` | ユーザープロフィールと実績バッジを表示する。 |
| `app/leaderboard/page.tsx` | ランキングを表示する。 |
| `app/api/preview/[problem]/[...path]/route.ts` | ブラウザから vulnerable app へアクセスするための Next.js サーバーサイド proxy。 |

### 主要コンポーネント

このコードベースは React の関数コンポーネント中心で、クラスコンポーネントはありません。
「クラス相当の責務」はコンポーネントとモジュール関数に分かれています。

| コンポーネント | 役割 |
|---|---|
| `AuthProvider` | Supabase の session/user を React Context で管理する。`signIn`、`signUp`、`signOut`、`useAuth()` を提供する。 |
| `ToastProvider` | 成功/エラー/info の toast 表示を管理する。`useToast()` を提供し、3 秒後に自動 dismiss する。 |
| `Header` | グローバルナビ。ログイン状態に応じて Dashboard/Logout/Login/Signup を出し分ける。 |
| `ChallengeCard` | 問題一覧のカード。脆弱性種別、難易度、学習概要、開始リンクを表示する。 |
| `ChallengePlayground` | 学習フローの中核。攻撃、コード確認、修正選択/編集、検証、スコア、ヒント、プレビュー反映をまとめて制御する。 |
| `VulnerableAppPreview` | Step 1 と editor preview 用の対話型プレビュー。問題ごとに login/comments/profile/download/ping 表示へ切り替える。 |
| `LiveAppIframe` | 実 container の GET 表示を iframe で表示する。主に `xss-comments` の `/comments` に使われる。 |
| `AttackPanel` | 自動攻撃ボタンと攻撃成功時の結果表示。現在は UI 上では攻撃確認を即時成功扱いにする。 |
| `CodeViewer` | 原因コードの読み取り用 `pre/code` 表示。 |
| `CodeEditor` | Monaco Editor の controlled wrapper。親から `value` を受け、変更を `onChange` で返す。 |
| `PatchSelector` | 選択式モードの修正案リスト。`PatchOption` を選ばせる。 |
| `ProgressStepper` | 4 ステップの進行状況を表示する。 |
| `NextActionCard` | 現在の状態から次に何をするかを表示する。 |
| `ScoreSummary` | 現在スコア、攻撃状態、防御状態の小さな summary を表示する。 |
| `ResultPanel` | 検証中/成功/失敗/エラーを表示し、`attackBefore` と `attackAfter` の詳細を可視化する。 |
| `GlossaryPanel` | `lib/glossary.ts` の用語集を `<details>` で表示する。 |
| `PageError` | network/auth/server エラーを UI 表示に変換する。 |
| `Spinner` | ローディング表示用の小さなスピナー。 |

### `ChallengePlayground` 内部の補助コンポーネント/関数

| 名前 | 役割 |
|---|---|
| `DifficultySwitcher` | `select` / `editPreview` / `editOnly` の難易度モード切り替え。 |
| `ScoreCapBadge` | 現在モードのスコア上限を表示する。 |
| `HintsPanel` / `HintItem` | ヒント一覧と開閉表示。 |
| `PreviewApplyControl` | エディタ内容を live container に反映するボタンとエラー表示。 |
| `VerifyTrigger` | パッチ検証の実行ボタン。 |
| `StickyMissionBar` | 現在ステップ、状態、選択中パッチ、次アクションを sticky 表示する。 |
| `ActiveStepHeader` | 各ステップのタイトルと説明。 |
| `StepSummaryList` / `StepSummary` | 左サイドバーのステップ別 summary。 |
| `getQuestUiStatus()` | 内部状態を `QuestUiStatus` に正規化する。 |
| `getCurrentStep()` | `QuestUiStatus` と `step1Confirmed` から現在ステップ番号を決める。 |
| `getCompletedSteps()` | 完了済みステップ番号の配列を作る。 |
| `getStatusLabel()` / `getNextActionLabel()` | 状態を日本語表示へ変換する。 |
| `getResultSummary()` | `defenseState` を短い結果文へ変換する。 |

### プレビュー実装

`VulnerableAppPreview` は `challenge.previewKind` に応じて表示を切り替えます。

| preview kind | コンポーネント | 実装 |
|---|---|---|
| `login` | `LoginPreview` | `/api/preview/:problem/login` へ POST し、`success: true` なら SQLi 成功として扱う。 |
| `comments` | `CommentsPreview` | `/comments` へ投稿し、iframe で HTML レンダリングを確認する。 |
| `profile` | `ProfilePreview` | `X-User-Id: user-1` で `/profile/:id` を叩き、他人の `secret` が返れば IDOR 成功と扱う。 |
| `download` | `DownloadPreview` | static-only 問題用の疑似 UI。実 container には接続しない。 |
| `ping` | `PingPreview` | static-only 問題用の疑似 UI。実 command は実行しない。 |

`app/api/preview/[problem]/[...path]/route.ts` は CORS 回避のための狭い proxy です。
転送対象は `sqli-login`、`xss-comments`、`idor-profile` の 3 つだけで、転送する header も `content-type` と `x-user-id` に絞っています。

### フロントエンド lib

| ファイル | 役割 |
|---|---|
| `lib/challengeTypes.ts` | Challenge、PatchOption、VerifyResult、AttackOutcome など UI/API 共通の型定義。 |
| `lib/problemContent.ts` | 5 問分の日本語教材コンテンツ、初期コード、正解/不正解パッチ、preview 設定の single source of truth。 |
| `lib/mockChallenges.ts` | `problemContent` から mock 用の `Challenge[]` を生成する。 |
| `lib/api/challenges.ts` | 問題取得、パッチ検証、プレビュー反映 API。orchestrator と mock/static-only の分岐を担当する。 |
| `lib/api.ts` | dashboard/leaderboard API。`ApiError` を投げる。 |
| `lib/supabase.ts` | ブラウザ用 Supabase client。env がない mock mode でも module 評価で落ちないよう null cast する。 |
| `lib/makePatch.ts` | `diff` パッケージで unified diff を生成する。`git apply` に合うよう `a/` と `b/` prefix を付ける。 |
| `lib/difficultyConfig.ts` | 難易度モードごとの patch input、preview 表示、hint 表示、score cap 設定。 |
| `lib/errors.ts` | `ApiError` class と、エラー種別分類の `classifyError()`。 |
| `lib/glossary.ts` | 用語集データ。 |

### 実際に存在する class

TypeScript/React 側で実際に `class` として定義されているのは `ApiError` だけです。

| class | ファイル | 役割 |
|---|---|---|
| `ApiError extends Error` | `packages/frontend/lib/errors.ts` | HTTP status を持つ API エラー。`classifyError()` が 401 を `auth`、それ以外を `server` として扱う。 |

## Orchestrator 実装

### `src/server.js`

Express API の入口です。

主な責務:

| 項目 | 内容 |
|---|---|
| `PROBLEM_META` | `sqli-login`、`xss-comments`、`idor-profile` の API 用メタデータを持つ。 |
| `enqueueContainerMutation()` | verify/preview apply の Docker 操作を直列化する。共有コンテナ状態の race を避けるため。 |
| `validatePatchRequest()` | 問題 ID、patch の型、汎用 patch 検証、問題別安全ポリシーをまとめて実行する。 |
| `GET /health` | orchestrator と vulnerable app の health をまとめて返す。 |
| `GET /problems/:id` | 問題メタデータと `packages/vulnerable-apps/<id>/src/server.js` の初期コードを返す。 |
| `POST /problems/:id/verify` | patch を一時ファイル化し、`verify()` を実行する。ログイン済みなら Supabase に提出記録を残す。 |
| `PATCH /problems/:id/preview` | container を baseline に戻し、patch を適用して preview 用に反映する。 |
| `POST /admin/reset` | `ALLOW_RESET=true` のときだけ全 vulnerable app を rebuild/reset する。 |
| `GET /me/dashboard` | 認証済みユーザーの profile、completed、submission_history を Supabase から返す。 |
| `GET /leaderboard` | backend-only Supabase RPC `get_leaderboard` を呼び、メールを含まない順位情報を返す。 |

### `src/applyPatch.js`

Docker container に patch を適用する低レベル処理です。

| 名前 | 役割 |
|---|---|
| `PROBLEMS` | 問題 ID から container 名、compose service、attack 名、patch 対象、host port を引く map。 |
| `waitForHealth(port, timeoutMs)` | `GET /health` を繰り返し、container が起動するまで待つ。 |
| `resetProblemContainer(problemId)` | `docker compose up <service> --build -d --force-recreate` で baseline に戻す。 |
| `applyPatch({ problemId, patchString })` | 一時 patch を container に `docker cp` し、`git apply --check` と `git apply` を container 内で実行し、service を restart する。 |

`git apply` では `--include=src/server.js --exclude=*` を使い、対象ファイルだけを適用する defense-in-depth を入れています。

### `src/verify.js`

検証サイクルを実行するモジュールです。CLI としても使えます。

処理順:

1. patch ファイルを読む。
2. `PROBLEMS` から port と attackName を決める。
3. container を baseline に reset。
4. baseline に対して `runAttack()` を実行し、攻撃が成功することを確認する。
5. patch を適用する。
6. patched container に対して `runAttack()` を再実行する。
7. `attackBefore.exploited === true && attackAfter.exploited === false` を `passed` とする。
8. レスポンス後、best-effort で container を baseline に戻す。

### `src/patchPolicy.js`

patch の安全性検証と summary 生成を担当します。

| 関数/定数 | 役割 |
|---|---|
| `PROBLEM_PATCH_POLICY` | 問題別に allowed files、max bytes、max added lines を定義する。現状は `sqli-login` と `idor-profile` に個別定義がある。 |
| `parseChangedFiles()` | unified diff の `+++` header から変更ファイルを抽出する。 |
| `countAddedLines()` | diff の追加行数を数える。 |
| `validatePatchSafety()` | 問題別 policy に基づき、空 patch、NUL、サイズ、rename/copy/binary、allowed files、追加行数を検査する。 |
| `validatePatch()` | 汎用検証。50 KB cap、`..` header 拒否、`src/` 配下のみ許可。 |
| `summarizePatch()` | 変更ファイル、追加/削除行数、最大 5 hunk の before/after summary を作る。 |

注意: `xss-comments` は `PROBLEM_PATCH_POLICY` の個別定義がなく、汎用検証と `applyPatch()` 側の `git apply --include=src/server.js` が主な制約になります。

### Docker/Auth/Scoring 補助モジュール

| ファイル | 役割 |
|---|---|
| `src/dockerCli.js` | `execFile` で `docker`/`docker compose`/`docker-compose` を呼ぶ wrapper。Compose v2 が使えない場合に legacy `docker-compose` へ fallback する。 |
| `src/auth/authMiddleware.js` | `optionalAuth` middleware。Bearer JWT がなければ `req.user=null`、あれば Supabase JWT を検証する。HS256、ES256、RS256に対応。 |
| `src/auth/supabaseClient.js` | backend-only Secret key でSupabase server clientを作る。 |
| `src/auth/scoring.js` | `recordSubmission()`。サーバーでモード別点数を決定し、backend-only RPCで履歴とBest scoreを1トランザクション保存する。 |

## Attack engine 実装

`packages/attack-engine` は orchestrator からライブラリとして呼ばれます。
CLI として `node src/index.js --target <url> --attack <name>` でも実行できます。

| ファイル | 役割 |
|---|---|
| `src/index.js` | CLI 引数を parse し、`runAttack()` を呼んで JSON 出力する。 |
| `src/runner.js` | attack 名を handler に map する。`sqli`、`xss`、`auth-bypass` を登録している。 |
| `src/attacks/sqli.js` | 複数 SQLi payload を `/login` に POST し、`success: true` が返れば exploited。 |
| `src/attacks/xss.js` | XSS payload を `/comments` に POST し、`GET /comments` の HTML に payload が unescaped で残れば exploited。最後に `/reset` を best-effort で呼ぶ。 |
| `src/attacks/authBypass.js` | `X-User-Id: user-1` で他人の `/profile/user-2` / `/profile/user-3` を読み、`secret` が漏れたら exploited。 |

Attack result は概ね次の shape です。

```ts
type AttackResult = {
  vulnerability: string;
  exploited: boolean;
  payload: string | null;
  evidence: string;
  durationMs: number;
};
```

## Vulnerable apps 実装

### 共通 Docker 構成

各 vulnerable app は `node:20-alpine` ベースの Dockerfile を持ちます。
主なポイントは次の通りです。

| 項目 | 内容 |
|---|---|
| Git baseline | container 内 `/app` で `git init` し、初期状態を commit する。`git apply` の対象にするため。 |
| 非 root 実行 | `appuser` を作り、entrypoint 後は `su-exec appuser` で Node を実行する。 |
| iptables | entrypoint が loopback と established/related 以外の outbound を REJECT する。 |
| healthcheck | `http://127.0.0.1:3000/health` を確認する。 |
| compose | `cap_add: NET_ADMIN`、`tmpfs`、memory/CPU limit を指定する。 |

### `sqli-login`

| 項目 | 内容 |
|---|---|
| 場所 | `packages/vulnerable-apps/sqli-login` |
| endpoint | `POST /login` |
| 脆弱性 | username/password を SQL 文字列に直接埋め込む SQL Injection。 |
| DB | `better-sqlite3` の in-memory DB。`src/db/init.sql` で初期化。 |
| 正解方針 | prepared statement で username/password を値として渡す。 |

### `xss-comments`

| 項目 | 内容 |
|---|---|
| 場所 | `packages/vulnerable-apps/xss-comments` |
| endpoint | `POST /comments`, `GET /comments`, `POST /reset` |
| 脆弱性 | author/text を HTML に直接結合する XSS。 |
| 状態 | `comments` 配列と `nextId` を process memory に保持。 |
| 正解方針 | author/text を HTML escape してから描画する。 |

### `idor-profile`

| 項目 | 内容 |
|---|---|
| 場所 | `packages/vulnerable-apps/idor-profile` |
| endpoint | `GET /profile/:id` |
| 脆弱性 | `req.userId` と `req.params.id` を比較せず、URL の id だけで profile を返す IDOR。 |
| 認証の簡略化 | `X-User-Id` header をログインユーザーとして扱う。未指定なら `user-1`。 |
| 正解方針 | handler 先頭で `req.userId !== req.params.id` の場合 403 を返す。 |

## Supabase/データモデル

### テーブル

| テーブル | 役割 |
|---|---|
| `profiles` | Supabase Auth userに対応する表示名だけのprofile。メールは重複保存しない。Auth insert/update triggerで同期される。 |
| `problems` | 問題 catalog。`base_score` を持つ。 |
| `submission_history` | すべての認証済み提出履歴。patch、passed、score mode、付与点、durationを保存する。 |
| `completed_problems` | 問題ごとのBest scoreとそのpatch。`unique(user_id, problem_id)`で1行に保つ。 |

### View/RPC/Trigger

| 名前 | 役割 |
|---|---|
| `get_leaderboard` RPC | `profiles`と`completed_problems`から、メールを含めずtotal scoreとcompleted countを集計する。 |
| `get_leaderboard(limit_n)` | leaderboard view を rank 付きで返す RPC。anon/authenticated に execute grant される。 |
| `handle_new_user()` | `auth.users` 作成時に `profiles` row を作る trigger function。 |

### RLS

`supabase/rls.sql` では各 table の RLS を有効化しています。
ブラウザロールからゲームテーブルへの権限はrevokeし、Auth以外はorchestrator API経由に限定します。採点・ランキングRPCも`service_role`だけが実行できます。
orchestrator は service role client を使うため、提出記録や dashboard 取得をサーバー側から実行できます。

## 環境変数

| 変数 | 利用場所 | 意味 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | orchestrator の base URL。未指定なら `http://localhost:4000`。 |
| `NEXT_PUBLIC_USE_MOCK` | frontend | challenge API は `true` のとき mock。dashboard/leaderboard API は `false` のとき実 API。デフォルトの扱いがファイル間で違うので注意。 |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase browser client の URL。 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | frontend | Supabase browser client のPublishable key。 |
| `SUPABASE_URL` | orchestrator | Supabase server client/JWT issuer/JWKS URL の基準。 |
| `SUPABASE_SECRET_KEY` | orchestrator | DB 書き込み/読み取り用のbackend-only Secret key。 |
| `SUPABASE_JWT_SECRET` | orchestrator | HS256 JWT 検証用。 |
| `SUPABASE_JWKS_URL` | orchestrator | ES256 JWT の JWKS URL override。 |
| `ALLOW_RESET` | orchestrator | `true` のときだけ `/admin/reset` を有効化する。 |
| `DOCKER_BIN` | orchestrator | `docker` binary override。 |
| `DOCKER_COMPOSE_BIN` | orchestrator | legacy compose binary override。 |

## 新しい問題を追加する場合

実 container 付きの問題を追加するには、概ね次を追加します。

1. `packages/vulnerable-apps/<problem-id>/` に `Dockerfile`、`entrypoint.sh`、`package.json`、`src/server.js`、`solution.patch` を作る。
2. `docker-compose.yml` に service、container name、host port を追加する。
3. `packages/orchestrator/src/applyPatch.js` の `PROBLEMS` に container/service/attack/port/patchTarget を追加する。
4. `packages/orchestrator/src/server.js` の `PROBLEM_META` に問題メタデータを追加する。
5. `packages/attack-engine/src/attacks/<attack>.js` を作り、`runner.js` の `ATTACKS` に登録する。
6. `packages/frontend/lib/problemContent.ts` に教材文言、初期コード、patchOptions、previewKind、liveViewMode を追加する。
7. `packages/frontend/lib/problemContent.ts` の `ProblemId` と `problemOrder` に ID を追加する。
8. 必要なら `app/api/preview/[problem]/[...path]/route.ts` と `LiveAppIframe.tsx` の port/path map に追加する。
9. `supabase/seed.sql` に catalog row を追加する。
10. `node packages/orchestrator/src/verify.js --problem <id> --patch packages/vulnerable-apps/<id>/solution.patch` で end-to-end 検証する。

static-only の教材問題として追加する場合は、orchestrator/attack-engine/Docker なしでも実装できます。
その場合は `problemContent.ts` と `STATIC_ONLY_PROBLEM_IDS`、preview UI の追加が中心になります。

## 実装上の注意点

- `ChallengePlayground` が UI 状態を広く持っているため、ステップ進行や検証ボタンの条件変更はここを中心に追う。
- `problemContent.ts` は教材文言と正解 patch の single source of truth なので、文言や選択肢変更はここを優先して見る。
- real API モードの問題コードは orchestrator が vulnerable app の `src/server.js` から読むため、frontend の `initialCode` と実 container のコードがズレないように注意する。
- `verify` と `preview apply` は同じ Docker container を mutate するため、orchestrator で直列化されている。
- `verify()` はレスポンス後に best-effort で baseline reset を走らせる。成功直後の preview 表示には「一時的に patched 状態、その後 reset」という時間差がある。
- `patchPolicy.js` と `applyPatch.js` の両方で patch 制約をかけている。セキュリティ境界を変更するときは両方を確認する。
- Supabase に記録できなくても verify 自体は成功しうる。スコア/ランキングの不整合を追うときは `recordSubmission()` のログを見る。
- `docs/STATUS.md` は古い状態の記述が混ざっているため、現在の実装確認にはこの文書と実コードを優先する。
