# フロントエンド連携ガイド

このドキュメントは、Next.js フロントエンドからバックエンドを叩くために必要なことを全部まとめたものです。

## 利用可能な問題

| 問題 ID | 脆弱性 | コンテナポート | 一言説明 |
|---|---|---|---|
| `sqli-login` | SQL インジェクション | 3001 | ログインフォームがユーザ入力を SQL クエリへ直接結合している |
| `xss-comments` | クロスサイトスクリプティング | 3002 | コメント掲示板がユーザ投稿テキストをエスケープせず HTML に出力している |
| `idor-profile` | 認可バイパス (IDOR) | 3003 | プロフィール API が URL の ID をそのまま信頼し、認証ユーザの確認をしていない |

orchestrator API は `http://localhost:4000` で動き、フロントエンドが叩いて良いホストはここだけ。上の表のコンテナポートは参考 / 直接プローブ用にのみ記載。

## バックエンド起動

```bash
# From the project root (~/Desktop/security-game):

# 1. Start the vulnerable app containers
docker-compose up sqli-login xss-comments idor-profile --build -d

# 2. Start the orchestrator API (port 4000)
node packages/orchestrator/src/server.js
```

CORS は `http://localhost:3000` (Next.js dev server) からのリクエストを許可する設定。

## ベース URL

```
http://localhost:4000
```

## Day 3 MVP で必要なエンドポイント

### 1. GET /problems/sqli-login

問題メタデータ + エディタに表示する脆弱なソースコードを返す。

主なフィールド: `initialCode` (表示するコード)、`hints` (ヒント文字列の配列)、`description` (平易な説明)。

### 2. POST /problems/sqli-login/verify

ボディ: `{ "patch": "<unified diff string>" }`

戻り値: `{ attackBefore, attackAfter, passed }`。

- `passed: true` はユーザが脆弱性を修正したことを意味する
- verify 呼び出しは 5〜15 秒かかる(コンテナリビルド + 攻撃実行)。ローディング状態を出すこと

コピペ可能な例は `curl-examples.md` を、正確なレスポンス形は `sample-responses.json` を参照。

## 推奨クライアントコードのパターン

両方の呼び出しをラップする `lib/api.ts` を1つ作る:

```ts
import type { Problem, VerifyResponse } from '@/types/arena';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Import mock data for offline development
import mockData from '../../docs/frontend-integration/sample-responses.json';

export async function getProblem(id: string): Promise<Problem> {
  if (USE_MOCK) return mockData.getProblem as Problem;
  const res = await fetch(`${BASE_URL}/problems/${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function verifyPatch(id: string, patch: string): Promise<VerifyResponse> {
  if (USE_MOCK) return mockData.verifyPassing as VerifyResponse;
  const res = await fetch(`${BASE_URL}/problems/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
```

`.env.local` に `NEXT_PUBLIC_USE_MOCK=true` を設定すると、バックエンドを動かさずに UI を開発できる。

## このディレクトリ内のファイル

| ファイル | 用途 |
|---|---|
| `types.ts` | TypeScript 型定義 — プロジェクトにコピーして使う |
| `sample-responses.json` | 実 API レスポンスを保存したもの — モックデータとして使える |
| `curl-examples.md` | 手動テスト用のコピペ可能 cURL コマンド集 |
| `README.md` | このファイル |
