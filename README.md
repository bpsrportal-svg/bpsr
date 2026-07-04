# BPSR Profile

Discord OAuthで本人確認し、Supabase PostgreSQLにゲーム内プロフィールを保存するNext.jsアプリです。

## セットアップ

1. Discord Developer PortalでOAuth2 Redirectに `http://localhost:3000/api/auth/callback/discord` を登録します。
2. `.env.example` を元に `.env` を作成します。
3. Supabase SQL Editorで `supabase/schema.sql` を実行します。
4. 依存関係を入れて起動します。

```bash
npm install
npm run dev
```

## 環境変数

- `AUTH_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`discord_user_id` はフォーム値ではなく、必ずサーバー側セッションから取得して保存します。
