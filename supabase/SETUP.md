# Supabase v2 再構築手順

SecureCodeArenaでは、Supabaseを認証・プロフィール・スコア保存だけに使います。
12問のDocker判定はXServer上で独立して動くため、Supabaseが休止してもゲスト判定は継続できます。

## 先に理解しておく構成

```text
Browser
  └─ Supabase Auth: ログイン、セッション取得だけ

XServer orchestrator
  ├─ Docker実攻撃で合否を確定
  └─ 合格後、backend-only Secret keyで履歴とスコアを保存

Supabase PostgreSQL
  ├─ profiles
  ├─ problems
  ├─ submission_history
  └─ completed_problems
```

ブラウザへ渡すのは`sb_publishable_...`だけです。`sb_secret_...`はXServer以外へ置きません。

## 0. 古いプロジェクトを確認する

古いデータが不要なら、そのまま新規プロジェクトを作成します。

古いデータが必要な場合は、Supabase Dashboardで次を確認します。

1. `Paused`でResume可能: 一度Resumeして`supabase db dump`で退避する。
2. Resume期限切れだがバックアップ取得可能: バックアップをダウンロードして新プロジェクトへ移行する。
3. Dashboardにも存在しない: ローカルに保存したdumpがなければ新規作成する。

古いPublishable/anon/Service Role keyは新プロジェクトで再利用しません。

## 1. 新しいFreeプロジェクトを作る

1. Supabase Dashboardで`New project`を選ぶ。
2. XServerに近いリージョンを選ぶ。
3. 強いDatabase Passwordを生成し、パスワード管理ツールへ保存する。
4. 作成完了まで待つ。

## 2. SQLを順番に適用する

DashboardのSQL Editorで、各ファイルの内容を上から順に実行します。

1. `supabase/schema.sql`
2. `supabase/migrations/add_best_score.sql`
3. `supabase/rls.sql`
4. `supabase/seed.sql`

`demo-seed.sql`はデモ専用です。本番では実行しません。

### 適用後の確認

SQL Editorで実行します。

```sql
select count(*) as problem_count from public.problems;

select routine_name, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('record_verified_submission', 'get_leaderboard')
order by routine_name, grantee;
```

期待結果:

- `problem_count = 12`
- 2つの関数に`anon`または`authenticated`の実行権限がない
- `record_verified_submission`は`service_role`だけがアプリから実行できる

## 3. Authenticationを設定する

Authentication → URL Configurationで設定します。

```text
Site URL: https://arena.example.jp
Redirect URLs:
  https://arena.example.jp/
  http://localhost:3000/
```

本番では実際に使うURLだけ登録します。広いワイルドカードはローカル開発以外で使いません。

メール確認・パスワード再設定を一般ユーザーへ提供する場合は、Authentication → Emails → SMTP Settingsへ独自SMTPを設定します。Supabase標準SMTPは開発確認用です。

## 4. 新しいキーを取得する

Project Settings → API KeysまたはConnect画面から取得します。

- Project URL: `https://PROJECT_REF.supabase.co`
- Publishable key: `sb_publishable_...`
- Secret key: `sb_secret_...`
- JWKS URL: `https://PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json`

Secret keyはRLSを迂回できるbackend専用キーです。チャット、ブラウザ、Git、`NEXT_PUBLIC_*`へ入れません。

## 5. ローカル環境変数を更新する

`packages/frontend/.env.local`:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

`packages/orchestrator/.env`:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_JWKS_URL=https://PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_JWT_SECRET=
```

新しい非対称署名プロジェクトでは`SUPABASE_JWT_SECRET`を空にします。

## 6. XServerの環境変数を更新する

VPSで次を編集します。

```bash
sudo nano /etc/securecodearena/frontend.env
sudo nano /etc/securecodearena/orchestrator.env
```

frontendにはProject URLとPublishable keyだけを設定します。orchestratorにはProject URL、JWKS URL、Publishable key、Secret keyを設定します。

反映します。

```bash
sudo /opt/security-game/deploy/release.sh
```

## 7. テストユーザーを作る

開発中はAuthentication → Users → Add userでテストユーザーを1人作ります。
メール確認を済ませた状態にし、ローカルの`.env`を新プロジェクトへ向けて実行します。

```bash
export TEST_JWT=$(./packages/orchestrator/scripts/get-test-jwt.sh 'TEST_PASSWORD' 'test@example.com')
```

## 8. 再設計後の受け入れテスト

1. 未ログインで問題を解く: Docker判定は成功し、DBには保存されない。
2. ログインして正解する: レスポンスの`recording.recorded`が`true`になる。
3. `submission_history`が1提出につき1行だけ増える。
4. 同じ問題を低いモードで解き直してもBest scoreが下がらない。
5. frontendから旧`upsert_completion`を呼ぶと関数が存在しない。
6. frontendからゲームテーブルへINSERT/UPDATEすると権限エラーになる。
7. Leaderboardと公開DBから、他ユーザーのメールアドレスを取得できない。

認証付きE2E:

```bash
TEST_JWT="$TEST_JWT" bash scripts/smoke-all.sh
```

Best scoreのDB検査:

```bash
TEST_USER_ID=<test-user-uuid> \
  node packages/orchestrator/scripts/verify-best-score.js
```

## 9. Free運用時の方針

Freeプロジェクトは低利用状態が続くと休止する可能性があります。そのため次の前提で運用します。

- Supabase休止中もゲストの12問Docker判定は動かす。
- ログイン・保存が失敗した場合は、判定結果を失敗扱いにしない。
- 定期的に`supabase db dump`を取得し、VPSとは別の安全な場所へ保管する。
- アカウント機能の常時稼働が必要になった時点でProを検討する。
