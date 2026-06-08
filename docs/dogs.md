# SecurePatch Quest — 現状まとめ

最終更新: 2026-06-08

---

## 1. プロジェクト概要

セキュリティ学習ゲーム。プレイヤーは新人ホワイトハッカーとして脆弱なアプリを診断し、攻撃を確認し、安全なパッチを選んで修正する。

- **フロントエンド名**: SecurePatch Quest
- **ゲームの流れ**: 攻撃テスト → コード確認 → パッチ選択 → 再テスト（4ステップ）
- **対応脆弱性**: SQLi / XSS / IDOR / パストラバーサル / コマンドインジェクション（後2つはモックのみ）

---

## 2. 起動方法（ターミナル3つ）

### ターミナル 1 — Docker（脆弱アプリ群）
```bash
cd /Users/fukuba/security-game
docker-compose up
```
| コンテナ名 | ホストポート | 役割 |
|---|---|---|
| arena-sqli-login | 3001 | SQL インジェクション問題 |
| arena-xss-comments | 3002 | XSS 問題 |
| arena-idor-profile | 3003 | IDOR 問題 |

### ターミナル 2 — Orchestrator（採点・検証 API）
```bash
cd /Users/fukuba/security-game/packages/orchestrator
npm start
```
→ `http://localhost:4000` で起動

### ターミナル 3 — Frontend（Next.js）
```bash
cd /Users/fukuba/security-game/packages/frontend
npm run dev
```
→ `http://localhost:3000` で起動（初回のみ30秒〜2分かかる）

**起動順序**: Docker → Orchestrator → Frontend の順が確実。

---

## 3. アーキテクチャ

```
ブラウザ (localhost:3000)
  │  fetch + Bearer JWT (ログイン時)
  ▼
Orchestrator API (localhost:4000) — packages/orchestrator/src/server.js
  │  docker exec / docker cp / git apply
  │  HTTP攻撃 (axios)
  ▼
Docker コンテナ群 (vuln-net ブリッジ、コンテナからの外部通信は iptables で遮断)
  ├── arena-sqli-login   :3001
  ├── arena-xss-comments :3002
  └── arena-idor-profile :3003

外部:
  Supabase (クラウド) — 認証 + Postgres
    tables: profiles, problems, completed_problems, submission_history
    RPC:    get_leaderboard
```

### 検証サイクル（パッチ提出時）
1. フロントエンド → `POST /problems/:id/verify`
2. Orchestrator がベースラインコンテナに攻撃 → `exploited: true` を確認
3. パッチをコンテナに適用 (`docker cp` → `git apply`)
4. コンテナ再起動 + ヘルスチェック待機
5. パッチ後に再攻撃 → `exploited: false` なら `passed: true`
6. 認証済みの場合は Supabase にスコアを記録

---

## 4. リポジトリ構成

```
security-game/
├── docker-compose.yml                    3つの脆弱アプリ定義
├── docs/
│   ├── dogs.md                           ← このファイル
│   ├── STATUS.md                         詳細なステータス（2026-06-05時点）
│   ├── ARCHITECTURE.md                   アーキテクチャ図
│   └── API_CONTRACT.md                   Orchestrator API 仕様
├── packages/
│   ├── frontend/                         Next.js 16.2.6 + React 19 + Tailwind 4
│   │   ├── app/                          ページルート
│   │   │   ├── page.tsx                  トップ (/)
│   │   │   ├── challenges/               問題一覧 (/challenges)
│   │   │   ├── challenges/[id]/          問題詳細 (/challenges/:id)
│   │   │   ├── login/ signup/            認証
│   │   │   ├── dashboard/                マイページ
│   │   │   └── leaderboard/              ランキング
│   │   ├── components/                   UIコンポーネント群
│   │   ├── lib/
│   │   │   ├── problemContent.ts         5問分のコンテンツ定義（全問）
│   │   │   ├── mockChallenges.ts         モック用チャレンジビルダー
│   │   │   ├── api/challenges.ts         Orchestrator API クライアント
│   │   │   └── supabase.ts               Supabase クライアント（env未設定時 null）
│   │   └── .env.local                    NEXT_PUBLIC_USE_MOCK=true + Supabase接続情報
│   ├── orchestrator/                     Express on port 4000
│   │   ├── src/server.js                 ルート定義（3問 + /health + /leaderboard等）
│   │   ├── src/verify.js                 パッチ検証パイプライン
│   │   ├── src/patchPolicy.js            パッチ入力バリデーション
│   │   ├── src/auth/                     Supabase JWT 認証
│   │   └── .env                          Supabase接続情報
│   ├── attack-engine/                    攻撃モジュール（ホスト側ライブラリ）
│   │   └── src/attacks/                  sqli.js / xss.js / authBypass.js
│   └── vulnerable-apps/                  Docker イメージソース
│       ├── sqli-login/
│       ├── xss-comments/
│       └── idor-profile/
├── supabase/
│   ├── schema.sql                        テーブル定義 + トリガー
│   ├── seed.sql                          3問分の問題データ
│   └── demo-seed.sql                     デモ用ダミーユーザー（本番禁止）
└── scripts/
    └── smoke-all.sh                      E2E スモークテスト（7ステップ）
```

---

## 5. 現在の動作状況

### 動いているもの ✅

| 機能 | 説明 |
|---|---|
| フロントエンド（モックモード） | `NEXT_PUBLIC_USE_MOCK=true` で5問すべてプレイ可能 |
| フロントエンド（リアルモード） | sqli / xss / idor の3問はバックエンドと実際に連携 |
| Docker コンテナ起動 | 3アプリが iptables でネット遮断された状態で起動 |
| パッチ検証パイプライン | ベースライン攻撃 → パッチ適用 → 再攻撃 → 結果返却 |
| Supabase 認証 | ログイン/サインアップ/セッション管理 |
| スコア記録 | 認証済みユーザーの初回クリアを Supabase に保存 |
| `/health` エンドポイント | Orchestrator + 各コンテナの死活確認 |
| ダッシュボード (`/me/dashboard`) | 認証済みユーザーのスコア・履歴表示 |

### 動いていないもの / 未実装 ❌

| 問題 | 詳細 |
|---|---|
| `path-traversal-files` / `cmd-injection-ping` | フロントエンドのコンテンツ定義はあるが Docker アプリ・Orchestrator 登録なし。モックモードでのみ動作 |
| `/leaderboard` | Supabase に `get_leaderboard` RPC がデプロイされていないと 500 エラー |
| 認証保護（ルートガード） | `middleware.ts` が削除されているため `/dashboard` 等は未認証でも直接アクセス可能 |
| `verifyレート制限` なし | 1リクエストで Docker ビルド2回 + 攻撃2回が走るため連続送信に弱い |
| `appliedPatchSummary` のUI表示 | Orchestrator は返しているがフロントエンドで未表示 |

---

## 6. 環境変数

### `packages/frontend/.env.local`
```env
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_SUPABASE_URL=https://ypynhbuwujnavrjbqmyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### `packages/orchestrator/.env`
```env
SUPABASE_URL=https://ypynhbuwujnavrjbqmyd.supabase.co
SUPABASE_JWKS_URL=https://.../.well-known/jwks.json
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_JWT_SECRET=<jwt secret>
```

---

## 7. 最近の変更（2026-06-08）

| 変更 | 内容 |
|---|---|
| `next.config.ts` 簡略化 | `turbopack.root` を削除。不要な設定で起動が重くなっていた |
| `.next/` キャッシュ削除 | 272MB の古いビルドキャッシュをクリア。次回起動が正常になる |
| `middleware.ts` 削除 | SSR 認証ミドルウェアを撤去（ルートガードが消えた点に注意） |
| `lib/supabase.ts` 更新 | env 未設定時に null を返すよう修正（クラッシュ防止） |

---

## 8. 動作確認手順

```bash
# バックエンドが正常か確認
curl -s http://localhost:4000/health | python3 -m json.tool
# → status:"ok", containersHealthy:true

# E2E スモークテスト（Orchestrator が :4000 で起動している状態で）
bash scripts/smoke-all.sh

# フロントエンドのみ確認（モックモード）
open http://localhost:3000/challenges/sqli-login
```
