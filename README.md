# SecureCodeArena

ゲーム形式のセキュアコーディング学習プラットフォーム — 脆弱性を見つけ、攻撃が刺さる様子を確認し、コードを修正し、修正が効いていることを実証する。

> 開発中 — ハッカソン用ビルド

## ローカル実行手順

```bash
# 1. 脆弱アプリのコンテナを起動
docker-compose up sqli-login --build -d

# 2. attack engine と orchestrator の依存をインストール
cd packages/attack-engine && npm install && cd ../..
cd packages/orchestrator && npm install && cd ../..

# 3. アプリが立ち上がっていることを確認
curl http://localhost:3001/health
# → {"status":"ok"}

# 4. (任意) orchestrator の HTTP API を 4000 番で起動
node packages/orchestrator/src/server.js
```

## SQLi 問題の検証手順

プロジェクトルートから end-to-end の検証を実行:

```bash
node packages/orchestrator/src/verify.js \
  --problem sqli-login \
  --patch packages/vulnerable-apps/sqli-login/solution.patch
```

期待結果: `attackBefore.exploited: true`、`attackAfter.exploited: false`、`passed: true`。

attack engine を単体で動かすこともできる:

```bash
node packages/attack-engine/src/index.js --target http://localhost:3001 --attack sqli
```

## 新しい問題を追加する手順

1. `packages/vulnerable-apps/<problem-id>/` 配下に以下を作成:
   - `Dockerfile` (`node:20-alpine` を使う、git をインストール、non-root で実行)
   - `package.json` (依存を記述)
   - `src/server.js` (意図的に脆弱な実装。`/health` エンドポイントを必ず含める)
   - `solution.patch` — 脆弱性を直す unified diff
2. `docker-compose.yml` にサービスを追加(ポートはユニークに)
3. `packages/orchestrator/src/applyPatch.js` の `PROBLEMS` マップ、および `packages/orchestrator/src/server.js` の `PROBLEM_META` マップに問題を登録
4. `packages/attack-engine/src/attacks/<type>.js` に攻撃ハンドラを追加し、`packages/attack-engine/src/runner.js` で登録
5. `verify.js` で end-to-end が通ることを確認

## デモ補助ツール

### 脆弱コンテナを全て初期化

デモが詰まった状態(パッチでコンテナが unhealthy になった等)になったら、orchestrator から1コールで全脆弱アプリをリビルドできる。
このエンドポイントは `ALLOW_RESET=true` で gate されているので、通常運用では 404 を返す。

```bash
ALLOW_RESET=true node packages/orchestrator/src/server.js
# 別ターミナルで:
curl -X POST http://localhost:4000/admin/reset
# → {"reset":true,"durationMs":12345}
```

`ALLOW_RESET=true` がないと、同じリクエストは `404 {"error":"Not found"}` を返す。

### デモ用にリーダーボードを seed する

審査員に見せる前に、問題カタログと(任意で)リーダーボードを投入し、画面が空にならないようにする:

```bash
# 1. 問題カタログ(idempotent — 何度実行しても安全)
psql "$DEMO_SUPABASE_URL" -f supabase/seed.sql

# 2. (任意) 偽リーダーボードのエントリ — デモ用プロジェクトのみで使用
psql "$DEMO_SUPABASE_URL" -f supabase/demo-seed.sql
```

`supabase/demo-seed.sql` は 4人のダミーユーザ(`aoi`, `taro`, `sakura`, `ren`)を `00000000-0000-0000-0000-…` 形式の UUID で作成するので、見つけて消すのが容易。
スクリプトを再実行すると前回の行を先に掃除するため、idempotent。先頭に "NEVER prod" 警告コメントがあるので必ず読むこと。

> 注: `supabase/demo-seed.sql` は `auth.users` 経由でテストユーザを挿入することで profiles トリガーを発火させている。`public.profiles` に直接 insert してはいけない — `profiles.id → auth.users(id)` の外部キー制約で弾かれる。

### テスト用 JWT を1行で取得

`packages/orchestrator/scripts/get-test-jwt.sh` は Supabase のトークン発行をラップし、`access_token` だけを出力するので、環境変数や curl ヘッダにそのままパイプできる。
`packages/orchestrator/.env` に `SUPABASE_URL` と `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) が設定されている必要がある。

```bash
export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh testtest)
# デフォルト以外のメールアドレスを使う場合:
export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh mypass me@example.com)

curl -H "Authorization: Bearer $TEST_JWT" \
  http://localhost:4000/problems/sqli-login
```

## デプロイ構成(本番)

本番は **XServer VPS 4GB / Ubuntu 24.04 LTS** の1台に、Caddy、Next.js、orchestrator、12問のDockerコンテナを同居させる。
認証とスコア保存には外部のSupabaseを使い、公開入口にはCloudflare FreeとCaddy HTTPSを使う。
4GBはこの構成の推奨開始サイズ。2GBはビルド時の余裕が小さく、8GBは同時利用が増えてからの変更でよい。

### XServerへ最短で配置する

1. XServer VPS 4GBをUbuntu 24.04 LTSとSSH公開鍵で作成する。
2. VPSパネルのパケットフィルターをONにし、`SSH`と`Web`だけを許可する。3000、4000、3001〜3012は開けない。
3. Cloudflareで本番ドメインのAレコードをVPSのIPv4へ向け、最初は`DNS only`にする。
4. [Supabase v2再構築手順](supabase/SETUP.md)に従い、`schema.sql`、`migrations/add_best_score.sql`、`rls.sql`、`seed.sql`の順で適用する。
5. 秘密情報と`node_modules`を除いたプロジェクトを`/opt/security-game`へ配置する。
6. VPSで以下を実行する。

```bash
sudo /opt/security-game/deploy/bootstrap-ubuntu.sh
sudo nano /etc/securecodearena/caddy.env
sudo nano /etc/securecodearena/frontend.env
sudo nano /etc/securecodearena/orchestrator.env
sudo /opt/security-game/deploy/release.sh
```

7. `https://<本番ドメイン>/api/orchestrator/health`の`containersHealthy`が`true`になることを確認する。
8. Cloudflareを`Proxied`、SSL/TLSを`Full (strict)`へ変更する。

環境変数の具体例、ソース転送コマンド、Supabase設定、更新・障害確認方法は
[`docs/DEPLOY_XSERVER_CLOUDFLARE.md`](docs/DEPLOY_XSERVER_CLOUDFLARE.md)を参照する。

### 何がどこで動いているか

| レイヤー | 実体 | 備考 |
|---|---|---|
| Web 公開 | Caddy (port 80/443) | Let's Encrypt 自動 HTTPS。`/api/orchestrator/*` を 4000 番へ、それ以外を 3000 番へリバプロ |
| Frontend | Next.js (`npm start`, port 3000) | systemd 常駐。`NEXT_PUBLIC_API_URL=/api/orchestrator` 経由で orchestrator を叩く |
| Orchestrator | Node プロセス (`server.js`, port 4000) | systemd 常駐。Docker CLI を直接叩く(同 VM 上の docker socket) |
| 脆弱アプリ | Docker コンテナ(12本) | `docker-compose.yml` の全サービスを起動。`127.0.0.1` のみにpublish |
| 認証 / DB | Supabase (外部、Free tier) | リーダーボード・完了履歴・JWT 検証 |

### Docker実攻撃による12問判定

全12問がコンテナを持ち、orchestrator 経由で実コンテナに `git apply` して実攻撃を流す。
`verifyMockPatch` + `staticPatchPasses` によるフロントエンド内静的判定は、
省メモリのために live 対象を絞った際のフォールバックとしてのみ使われる。

| 問題種別 | 検証経路 | コンテナ |
|---|---|---|
| Docker 検証12問 (sqli-login / xss-comments / idor-profile / path-traversal-files / cmd-injection-ping / csrf-transfer / hardcoded-secrets / open-redirect / file-upload / review-support-portal / review-account-workflow / review-file-workbench) | orchestrator → Docker コンテナ越しに `git apply` + 実攻撃 | あり (12本) |
| 静的判定フォールバック | live対象外に絞った省メモリ構成でのみ `verifyMockPatch` + `staticPatchPasses`を使用 | 対象外の問題は停止可能 |

この範囲は frontend 側の `NEXT_PUBLIC_DOCKER_PROBLEM_IDS`、orchestrator 側の `LIVE_DOCKER_PROBLEM_IDS` の2つの環境変数で制御する。
両者は常に同じ値にしておくこと(`deploy/release.sh` が docker-compose.yml とのズレを検出して停止する)。
`NEXT_PUBLIC_*` はビルド時に埋め込まれるため、値を変えたら Next.js の再ビルド(= `release.sh` 再実行)が必要。
メモリの厳しい環境へ載せる場合は、この2つを応用3問だけに絞れば以前の省メモリ構成に戻せる。

### 必要な環境変数

**Frontend (`packages/frontend/.env.local`)**:
```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_DOCKER_PROBLEM_IDS=sqli-login,xss-comments,idor-profile,path-traversal-files,cmd-injection-ping,csrf-transfer,hardcoded-secrets,open-redirect,file-upload,review-support-portal,review-account-workflow,review-file-workbench
NEXT_PUBLIC_API_URL=/api/orchestrator
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable key>
```

**Orchestrator (`packages/orchestrator/.env`)**:
```env
LIVE_DOCKER_PROBLEM_IDS=sqli-login,xss-comments,idor-profile,path-traversal-files,cmd-injection-ping,csrf-transfer,hardcoded-secrets,open-redirect,file-upload,review-support-portal,review-account-workflow,review-file-workbench
FRONTEND_ORIGIN=https://<your-deployment-url>
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_JWKS_URL=https://<your-project>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_PUBLISHABLE_KEY=<sb_publishable key>
SUPABASE_SECRET_KEY=<sb_secret key: backend only>
# 現行のES256/JWKSプロジェクトでは空。旧HS256プロジェクトだけ設定する。
SUPABASE_JWT_SECRET=
```

### メモリ使用目安

- Caddy: ~30MB
- Next.js (`npm start`): ~200-250MB
- Orchestrator: ~80MB
- dockerd: ~120MB
- Docker コンテナ × 12: **アイドル時実測 約143MB**(各約11-13MB。capは各256MB)

合計 **約 600-800MB**(OS除く目安)。12本ぶんの256MB capを合計すると3GBになるが、
cap は予約ではなく上限で、verify は `containerMutationQueue` で直列化されるため
同時に上限へ張り付くのは事実上1本だけ。4GB VPS なら大きく余る。

12イメージは`node:20-alpine`のベース層を共有する。ソース、依存、ビルドキャッシュを含めて最低5GB程度の空きを確保する。
`release.sh`は毎回dangling imageをpruneする。

> 2026-08-24に4GB / aarch64のDocker VM上で全12本を起動して`docker stats`を採取。
> 全12問で`verify.js`のend-to-end(攻撃成功 → パッチ → 攻撃失敗 → ベースライン復旧)を確認済み。

### 公開 URL

`https://<本番ドメイン>`

Supabase 側の Authentication → URL Configuration にも上記 URL を Site URL / Redirect URLs として登録すること。

---

## ドキュメント

- `docs/ARCHITECTURE.md` — システム構成図とデータフロー
- `docs/API_CONTRACT.md` — フロントエンド連携用の orchestrator HTTP API 仕様
- `docs/DEPLOY_XSERVER_CLOUDFLARE.md` — XServer VPS 4GBへの本番デプロイ手順
