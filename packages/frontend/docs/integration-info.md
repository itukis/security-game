# SecurePatch Quest 結合情報

この資料は、SecurePatch QuestのCフロントmockをバックエンドAPIへ結合するための共有資料です。現在の実装ファイルを確認したうえで、API仕様はユーザー共有仕様を優先して記載しています。

`API_CONTRACT.md` / `ARCHITECTURE.md` / `curl-examples.md` は、このリポジトリ内では確認できませんでした。そのため、API契約の細部は「未確認」と明記しています。

## 使用技術

- Next.js: `16.2.6`
- React: `19.2.4`
- TypeScript: `^5`
- Tailwind CSS: `^4`
- ESLint: `^9`
- ルーティング: Next.js App Router
- API結合口: `lib/api/challenges.ts`

## 起動方法

```bash
npm install
npm run dev
```

開発サーバー:

```txt
http://localhost:3000
```

確認コマンド:

```bash
npm run lint
npm run build
```

## ルーティング

| URL | ファイル | 内容 |
| --- | --- | --- |
| `/` | `app/page.tsx` | トップページ |
| `/challenges` | `app/challenges/page.tsx` | 問題一覧 |
| `/challenges/[id]` | `app/challenges/[id]/page.tsx` | 問題詳細 |
| `/challenges/sqli-login` | `app/challenges/[id]/page.tsx` | 現在のSQL Injection問題 |

`app/challenges/[id]/page.tsx` では `generateStaticParams()` が `getProblems()` の結果からIDを返します。

## 主要ファイル

### app

- `app/page.tsx`: トップページ
- `app/challenges/page.tsx`: 問題一覧
- `app/challenges/[id]/page.tsx`: 問題詳細
- `app/layout.tsx`: ルートレイアウト、メタデータ、フォント設定

### components

- `Header`: 共通ヘッダー
- `ChallengeCard`: 問題カード
- `ChallengePlayground`: 詳細ページの状態管理とプレイ画面
- `VulnerableAppPreview`: 脆弱なログイン画面プレビュー
- `CodeViewer`: コード表示。後でMonaco Editorに差し替える想定
- `AttackPanel`: 攻撃テスト表示
- `PatchSelector`: 修正案選択
- `ResultPanel`: 再テスト結果、APIエラー、解説表示
- `ScoreSummary`: スコア表示
- `ProgressStepper`: 4ステップ進行表示
- `NextActionCard`: 次にやること表示

### lib

- `lib/challengeTypes.ts`: 型定義
- `lib/mockChallenges.ts`: mock問題データ
- `lib/api/challenges.ts`: mock/API切り替え口

## 型定義

現在の型定義は `lib/challengeTypes.ts` にあります。

### `PatchOption`

```ts
export type PatchOption = {
  id: string;
  title: string;
  description: string;
  patch: string;
  isCorrect: boolean;
};
```

`patch` は unified diff string です。現在は修正案を選ぶと、その修正案に紐づく `patch` を `verifyPatch(id, patch)` に渡します。

### `ProblemResponse`

```ts
export type ProblemResponse = {
  id: string;
  title: string;
  description: string;
  vulnerability: VulnerabilityType;
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
};
```

`GET /problems/:id` のレスポンス想定です。

### `VerifyResult`

現在の実装型:

```ts
export type VerifyResult = {
  attackBefore: VerifyValue;
  attackAfter: VerifyValue;
  passed: boolean;
};
```

`VerifyValue` は `string | boolean | number | Record<string, unknown> | null` です。API結合後の `attackBefore` / `attackAfter` は、次の `AttackResult` オブジェクトとして扱う想定です。

## API仕様

Base URL:

```txt
http://localhost:4000
```

問題ID:

```txt
sqli-login
```

### `GET /problems/:id`

例:

```txt
GET http://localhost:4000/problems/sqli-login
```

返却項目:

```ts
type ProblemResponse = {
  id: string;
  title: string;
  description: string;
  vulnerability: "SQL Injection" | "XSS" | "Authentication Bypass";
  targetEndpoint: string;
  hints: string[];
  initialCode: string;
};
```

補足:

- `difficulty`, `status`, `scenario`, `patchOptions`, `explanation` は現在フロント側で補完しています
- 問題一覧APIがあるかは未確認です
- 現在の非mock `getProblems()` は `sqli-login` 1件を `getProblem()` で取得します

### `POST /problems/:id/verify`

例:

```txt
POST http://localhost:4000/problems/sqli-login/verify
```

Request body:

```json
{
  "patch": "<unified diff string>"
}
```

Response body:

```json
{
  "attackBefore": {
    "vulnerability": "SQL Injection",
    "exploited": true,
    "payload": "' OR '1'='1",
    "evidence": "ログイン認証が突破されたことを示す情報",
    "durationMs": 1234
  },
  "attackAfter": {
    "vulnerability": "SQL Injection",
    "exploited": false,
    "payload": "' OR '1'='1",
    "evidence": "パッチ適用後に攻撃が成立しなかったことを示す情報",
    "durationMs": 1320
  },
  "passed": true
}
```

### `AttackResult`

`attackBefore` / `attackAfter` は文字列ではなく、以下のオブジェクトです。

```ts
type AttackResult = {
  vulnerability: string;
  exploited: boolean;
  payload: string;
  evidence: string;
  durationMs: number;
};
```

| フィールド | 意味 |
| --- | --- |
| `vulnerability` | 検証対象の脆弱性名 |
| `exploited` | 攻撃が成立したか |
| `payload` | 検証に使ったペイロード |
| `evidence` | 判定根拠として表示できる説明 |
| `durationMs` | 検証にかかった時間 |

### `passed`

`passed: true`:

- パッチ適用後に攻撃が成立しなかった
- 典型的には `attackBefore.exploited === true` かつ `attackAfter.exploited === false`
- フロントでは防御成功として表示します

`passed: false`:

- パッチ適用後も攻撃が成立した、または検証基準を満たさなかった
- 典型的には `attackAfter.exploited === true`
- フロントでは防御失敗として表示します

判定ロジックの厳密な条件はバックエンド側仕様として未確認です。

## 環境変数

`.env.local` は現在のリポジトリ直下には存在しませんでした。

mockのまま動かす場合:

```txt
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=http://localhost:4000
```

APIへ接続する場合:

```txt
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:4000
```

手順:

1. プロジェクト直下に `.env.local` を作成する
2. `NEXT_PUBLIC_USE_MOCK=false` を設定する
3. `NEXT_PUBLIC_API_URL=http://localhost:4000` を設定する
4. `npm run dev` を再起動する

現在の実装では、`NEXT_PUBLIC_USE_MOCK` が文字列 `"true"` の場合だけmockを使用します。

## CORS

フロントは通常 `http://localhost:3000` で起動します。バックエンドは `http://localhost:4000` を想定しています。

バックエンド側では、少なくとも次を許可してください。

- Origin: `http://localhost:3000`
- Methods: `GET`, `POST`, `OPTIONS`
- Headers: `Content-Type`

CORSの具体的な設定方法はバックエンド実装に依存するため未確認です。

## 現在mockでできていること

- `/`, `/challenges`, `/challenges/sqli-login` を表示
- `sqli-login` の1問をプレイ
- 攻撃テストを学習用の疑似判定で表示
- 原因コードを `CodeViewer` で表示
- 3つの修正案から選択
- 正解なら防御成功、不正解なら防御失敗
- verify中に「検証中」「攻撃前テスト中」「パッチ適用中」「再攻撃中」を表示
- APIエラー時の表示枠を用意

mockでは本物の攻撃処理、SQL実行、DB接続、外部通信は行っていません。

## API結合後に変わること

- `getProblem(id)` が `GET /problems/:id` から問題を取得する
- `verifyPatch(id, patch)` が `POST /problems/:id/verify` にpatchを送る
- `attackBefore` / `attackAfter` は `AttackResult` オブジェクトとして返る
- verifyは5〜15秒程度かかる可能性がある
- フロントのloading表示が、実際の検証待ち時間に対応する
- `passed` の値により防御成功/失敗が決まる

現在の `ResultPanel` はオブジェクト値を `JSON.stringify` して表示できます。ただし、より見やすく表示するには、将来的に `AttackResult` 専用UIへ整える余地があります。

## API差し替え口

APIアクセスは `lib/api/challenges.ts` に集約されています。

```ts
getProblems(): Promise<Challenge[]>
getProblem(id: string): Promise<Challenge | undefined>
verifyPatch(id: string, patch: string): Promise<VerifyResult>
```

画面側の利用箇所:

- `app/challenges/page.tsx`: `getProblems()`
- `app/challenges/[id]/page.tsx`: `getProblems()`, `getProblem(id)`
- `components/ChallengePlayground.tsx`: `verifyPatch(challenge.id, selectedPatch.patch)`

Monaco Editorを入れる場合も、最終的にはエディタで生成した unified diff string を `verifyPatch(id, patch)` に渡す想定です。

## バックエンド結合時の確認事項

- `GET /problems/sqli-login` が成功するか
- `ProblemResponse` の項目名と型が一致するか
- `vulnerability` の値がフロント型と一致するか
- `initialCode` が文字列で返るか
- `hints` が文字列配列で返るか
- `POST /problems/sqli-login/verify` が `{ patch: string }` を受け取るか
- `attackBefore` / `attackAfter` が `AttackResult` オブジェクトで返るか
- `passed` がbooleanで返るか
- verifyに5〜15秒かかってもタイムアウトしないか
- CORSで `http://localhost:3000` からアクセスできるか
- APIエラー時のレスポンス形式が決まっているか

## 結合チェックリスト

- [ ] バックエンドを `http://localhost:4000` で起動する
- [ ] `.env.local` に `NEXT_PUBLIC_USE_MOCK=false` を設定する
- [ ] `.env.local` に `NEXT_PUBLIC_API_URL=http://localhost:4000` を設定する
- [ ] フロントを再起動する
- [ ] `/challenges/sqli-login` を開ける
- [ ] `GET /problems/sqli-login` が呼ばれる
- [ ] 修正案選択後、`POST /problems/sqli-login/verify` が呼ばれる
- [ ] request body が `{ patch: "<unified diff string>" }` になっている
- [ ] loading表示が出る
- [ ] `attackBefore.vulnerability` が表示可能
- [ ] `attackBefore.exploited` が表示可能
- [ ] `attackAfter.exploited` が表示可能
- [ ] `passed: true` で防御成功になる
- [ ] `passed: false` で防御失敗になる
- [ ] APIエラー時に `ResultPanel` にエラーが表示される
