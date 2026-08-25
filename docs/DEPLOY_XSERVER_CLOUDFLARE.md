# XServer VPS 4GB + Cloudflare Free 本番デプロイ

SecureCodeArenaの12問すべてを、Docker実攻撃で自動判定できる状態で公開する手順です。
この順番で上から進めれば、XServer VPS 4GBの1台で運用できます。

## 完成形

```text
ブラウザ
  ↓ HTTPS
Cloudflare Free
  ↓ 80 / 443
Caddy
  ├─ Next.js                     127.0.0.1:3000
  ├─ orchestrator               127.0.0.1:4000
  └─ Docker脆弱アプリ12本        127.0.0.1:3001〜3012

Supabase                        認証・スコア・履歴
```

外部へ公開するポートは22、80、443だけです。3000、4000、3001〜3012は開けません。

## 0. 先に用意するもの

- XServer VPS 4GB
- 独自ドメイン、または既存ドメインのサブドメイン。例: `arena.example.jp`
- Cloudflare Freeアカウント
- Supabaseプロジェクト
- SSH公開鍵と秘密鍵
- このリポジトリの最新版

以下では本番URLを`https://arena.example.jp`として説明します。自分のドメインへ読み替えてください。

### 結論: 4GBプランでよいか

この構成なら、最初は通常のXServer VPS 4GBで十分です。4GBプランは4 vCPU、NVMe SSD 150GBで、今回の実測では12問のDockerコンテナを全部起動してもアイドル時合計は約143MBでした。ビルド時の一時的な負荷には、後述の直列ビルドと2GB swapで対応します。

- 2GB: ビルドや複数検証の余裕が小さく、現在は新規受付も一時停止中なので選ばない。
- 4GB: 個人開発、継続公開、少人数のデモに推奨。
- 8GB: 同時利用者が増え、CPU・メモリ不足を実測してから変更する。

2026年8月24日時点の通常4GB料金は、1ヶ月契約で月額2,200円、12ヶ月契約で月額1,800円、36ヶ月契約で月額1,700円です。2026年9月1日以降はそれぞれ2,640円、2,200円、2,035円へ改定予定です。いきなり長期契約せず、まず1ヶ月動かして負荷を確認し、継続が決まったら長期契約へ切り替えるのが安全です。料金は税込で、申込み前に[XServer VPS公式プラン](https://vps.xserver.ne.jp/)と[2026年9月1日の料金改定案内](https://vps.xserver.ne.jp/support/news_detail.php?view_id=19107)を再確認してください。

## 1. XServer VPSを作成する

XServer VPSの申込み画面で次を選びます。

| 項目 | 選択内容 |
|---|---|
| プラン | 4GB |
| OS | Ubuntu 24.04 LTS |
| SSH Key | 手元の公開鍵をインポート、またはXServerで自動生成 |
| rootパスワード | 十分に長い固有の値 |

自動生成した秘密鍵は一度しかダウンロードできないため、安全な場所へ保存します。
XServer公式の手順は[SSH Key](https://vps.xserver.ne.jp/support/manual/man_server_ssh.php)を参照してください。

VPS作成後、VPSパネルでIPv4アドレスを確認します。

### パケットフィルター

VPSパネルの「パケットフィルター設定」を開き、次のようにします。

1. パケットフィルターを`ON`にする。
2. `SSH`を追加する。可能なら接続元を自分の固定IPに限定する。
3. `Web`を追加する。これでTCP 80と443が許可される。
4. 3000、4000、3001〜3012のルールは追加しない。

XServer公式の説明は[パケットフィルター設定](https://vps.xserver.ne.jp/support/manual/man_server_port.php)にあります。

ローカルPCから接続を確認します。

```bash
ARENA_VPS_IP=203.0.113.10
ARENA_SSH_KEY=/absolute/path/to/xserver-key
chmod 600 "$ARENA_SSH_KEY"
ssh -i "$ARENA_SSH_KEY" root@"$ARENA_VPS_IP"
```

## 2. Cloudflareでドメインを向ける

1. Cloudflareへドメインを追加する。
2. Cloudflareが表示するネームサーバーへ、ドメイン側の設定を変更する。
3. DNSにAレコードを追加する。

| 項目 | 値の例 |
|---|---|
| Type | `A` |
| Name | `arena` |
| IPv4 address | XServer VPSのIPv4 |
| Proxy status | 最初は`DNS only` |

Caddyが最初のTLS証明書を取得するまでは`DNS only`のままにします。

## 3. Supabaseを12問対応にする

新規Supabaseプロジェクトの場合は、[Supabase v2再構築手順](../supabase/SETUP.md)に従い、SQL Editorで次のファイルを順番に実行します。

1. `supabase/schema.sql`
2. `supabase/migrations/add_best_score.sql`
3. `supabase/rls.sql`
4. `supabase/seed.sql`

`seed.sql`には12問すべてが入っています。既存プロジェクトの場合も、更新後の`seed.sql`を再実行すれば不足分だけ追加されます。

Supabase Dashboardで次の値を控えます。

- Project URL
- Publishable key（`sb_publishable_...`）
- Secret key（`sb_secret_...`）。これはVPS以外へ公開しない。

AuthenticationのURL Configurationを次のように設定します。

```text
Site URL:      https://arena.example.jp
Redirect URLs: https://arena.example.jp/
```

## 4. ソースをVPSへ転送する

ローカルPCでリポジトリのルートへ移動し、次を実行します。

```bash
ARENA_VPS_IP=203.0.113.10
ARENA_SSH_KEY=/absolute/path/to/xserver-key

ssh -i "$ARENA_SSH_KEY" root@"$ARENA_VPS_IP" 'mkdir -p /opt/security-game'

rsync -az \
  --exclude '.git/' \
  --exclude '**/node_modules/' \
  --exclude '**/.next/' \
  --exclude '**/.env' \
  --exclude '**/.env.*' \
  --exclude '**/*.tsbuildinfo' \
  -e "ssh -i $ARENA_SSH_KEY" \
  ./ root@"$ARENA_VPS_IP":/opt/security-game/
```

`.env`、`.env.local`、`node_modules`は転送しません。秘密情報は次の手順でVPS上だけに作ります。

## 5. Ubuntuを初期設定する

VPSへSSH接続し、配置を確認してから初期設定スクリプトを実行します。

```bash
cd /opt/security-game
ls README.md deploy docker-compose.yml
sudo /opt/security-game/deploy/bootstrap-ubuntu.sh
```

このスクリプトは次を準備します。

- Node.js 22
- DockerとDocker Compose v2
- Caddy
- 2GB swap
- 自動セキュリティ更新
- 専用の`arena`ユーザー
- デプロイ確認用の`git`、`jq`、`lsof`、`rsync`

## 6. 本番環境変数を設定する

初期設定後、次の3ファイルが作成されています。

### Caddy

```bash
sudo nano /etc/securecodearena/caddy.env
```

```env
SITE_DOMAIN=arena.example.jp
ACME_EMAIL=your-email@example.jp
```

### Frontend

```bash
sudo nano /etc/securecodearena/frontend.env
```

ファイルにある12問の`NEXT_PUBLIC_DOCKER_PROBLEM_IDS`は変更せず、次の2値を自分のSupabase値へ置き換えます。

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

### Orchestrator

```bash
sudo nano /etc/securecodearena/orchestrator.env
```

```env
FRONTEND_ORIGIN=https://arena.example.jp
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_JWKS_URL=https://PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

現行のES256/JWKS方式なら`SUPABASE_JWT_SECRET=`は空のままにします。旧HS256プロジェクトだけJWT secretを設定します。

`LIVE_DOCKER_PROBLEM_IDS`と`NEXT_PUBLIC_DOCKER_PROBLEM_IDS`は、12問を同じ内容で並べる必要があります。`release.sh`が不一致を検出した場合は起動前に停止します。

## 7. ビルドして起動する

Cloudflareがまだ`DNS only`であることを確認して実行します。

```bash
sudo /opt/security-game/deploy/release.sh
```

初回はnpm依存、Next.js、Dockerイメージ12本を作るため時間がかかります。4GBを使い切らないよう、Dockerイメージは1本ずつ直列でビルドされます。

完了時に次が表示されれば、VPS内部のヘルスチェックは成功です。

```text
Frontend, orchestrator, and challenge containers are healthy.
Release completed successfully.
```

## 8. デプロイ直後の確認

VPS内で確認します。

```bash
cd /opt/security-game

systemctl is-active caddy
systemctl is-active securecodearena-frontend
systemctl is-active securecodearena-orchestrator

docker compose ps
curl -fsS http://127.0.0.1:4000/health
curl -fsS https://arena.example.jp/api/orchestrator/health
```

期待する状態は次のとおりです。

- systemdの3サービスがすべて`active`
- Dockerコンテナ12本が`Up`または`healthy`
- 公開ヘルスレスポンスが`"status":"ok"`
- `"problems"`が12件
- `"containersHealthy":true`

### 12問の攻撃・修正・再攻撃をすべて検査する

この検査は各コンテナを順番に再構築するため数分かかります。利用者がいない時間に実行してください。

```bash
cd /opt/security-game
sudo systemctl stop securecodearena-orchestrator

if sudo -u arena bash scripts/smoke-all.sh; then
  echo '12問のスモークテスト成功'
else
  echo 'スモークテスト失敗。上のログを確認'
fi

sudo systemctl start securecodearena-orchestrator
```

最後にもう一度確認します。

```bash
curl -fsS https://arena.example.jp/api/orchestrator/health
```

## 9. Cloudflareを有効化する

HTTPS表示とAPIヘルスが成功したら、Cloudflareを次の設定へ変更します。

1. AレコードのProxy statusを`Proxied`へ変更する。
2. SSL/TLS encryption modeを`Full (strict)`にする。
3. Rocket Loaderを無効のままにする。
4. `/api/*`をキャッシュするCache Ruleは作らない。

Caddy側も`/api/*`へ`Cache-Control: no-store`を付与しています。

## 10. ブラウザで最終確認する

- トップページと12問一覧が表示される。
- 新規登録、ログイン、ログアウトができる。
- 12問それぞれで攻撃確認が動く。
- 正解パッチで防御成功になる。
- `path-traversal-files`と`cmd-injection-ping`も疑似判定ではなくDocker実攻撃になる。
- スコア、ダッシュボード、リーダーボードが保存・表示される。
- ブラウザのNetworkタブに3001〜3012への直接アクセスがない。

## 更新方法

ローカルから同じ`rsync`を再実行し、VPSでリリースします。`/etc/securecodearena`の秘密情報は上書きされません。

```bash
sudo /opt/security-game/deploy/release.sh
```

大きな更新の前にはXServer VPSのイメージ保存を作成してください。

## 再起動後の確認

全Dockerサービスには`restart: unless-stopped`が設定されています。計画停止後にVPSを再起動した場合は次を確認します。

```bash
systemctl is-active caddy securecodearena-frontend securecodearena-orchestrator
docker compose -f /opt/security-game/docker-compose.yml ps
curl -fsS https://arena.example.jp/api/orchestrator/health
```

## 障害時に見るコマンド

```bash
journalctl -u securecodearena-frontend -n 100 --no-pager
journalctl -u securecodearena-orchestrator -n 100 --no-pager
journalctl -u caddy -n 100 --no-pager

cd /opt/security-game
docker compose ps
docker compose logs --tail=100
free -h
df -h
```

設定を直した後は`sudo /opt/security-game/deploy/release.sh`を再実行します。

## 公開運用の注意

- `ALLOW_RESET=false`を維持する。
- `/etc/securecodearena/orchestrator.env`を共有・Gitコミットしない。
- 3000、4000、3001〜3012を外部公開しない。
- Docker検証はCPUを使うため、広く公開する前に検証・プレビューAPIへ認証またはレート制限を追加する。
- XServerの自動更新を有効にし、契約切れを防ぐ。
- OSとDockerの更新、大きなリリース前にはスナップショットを取る。
