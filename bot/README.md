# Discord募集Bot v1

## 先にSupabase SQL Editorで実行

`supabase/bot_v1.sql` を実行してください。既存の `profiles` / `user_imagines` / `imagine_masters` はそのまま使います。

## 必須環境変数

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
AUTH_DISCORD_ID=... # 既存OAuthのClient ID。DISCORD_CLIENT_IDでも可
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 推奨環境変数

```env
RECRUITMENT_CHANNEL_ID=募集投稿先チャンネルID
OPERATIONS_ROLE_ID=運営ロールID
PROOF_CATEGORY_ID=証明チャンネル用カテゴリID
APPLICATION_CATEGORY_ID=申請一覧用カテゴリID
PARTY_CATEGORY_ID=パーティ用カテゴリID
PUBLIC_VC_CATEGORY_ID=公開VC用カテゴリID
```

カテゴリIDを入れない場合、Botが次のカテゴリ名で探し、なければ作成します。

```env
PROOF_CATEGORY_NAME=証明チャンネル
APPLICATION_CATEGORY_NAME=募集申請
PARTY_CATEGORY_NAME=パーティ
```

## コンテンツ別メンションロール

必要なものだけ設定してください。未設定でも募集は投稿されます。

```env
CONTENT_ROLE_DECAY_ABYSS_ID=
CONTENT_ROLE_ROCKSNAKE_NEST_ID=
CONTENT_ROLE_ARATAMA_TEMPLE_ID=
CONTENT_ROLE_SILENT_CITY_ID=
CONTENT_ROLE_LIGHTLESS_PRISON_ID=
CONTENT_ROLE_GENKA_RYUGETSU_FIELD_ID=
CONTENT_ROLE_REGDINIS_RUINS_ID=
CONTENT_ROLE_HORNGOAT_FLOWER_BLADE_ID=
CONTENT_ROLE_PHANTOM_FLOWER_REMAINS_ID=
CONTENT_ROLE_ECLIPSE_FLOWER_SHADOW_ID=
```

## Botに必要なDiscord権限

- Send Messages
- Embed Links
- Use Slash Commands
- Manage Channels
- Manage Roles またはチャンネル権限上書き可能な権限
- Read Message History
- Connect / Manage Voice Channels相当

Botのロールは、作成・編集したいカテゴリやチャンネルより上に置いてください。

## 起動

```bash
npm run bot:register
npm run bot:start
```

`bot:start` は常時起動が必要です。PCを落とすとBotも止まるため、常用する場合はRailway、Render、Fly.io、VPSなどの常時稼働先で起動してください。
## Web-first pivot note

The product direction changed after Raspberry Pi was selected as the always-on Bot host.

The Web app is now the main recruitment surface. Discord Bot should be treated as a worker for notifications, VC creation, channel creation, and permission management.

Implications:

- `/profile` can remain useful.
- `/recruit-create` should not be the primary recruitment creation path.
- Web recruitment creation should write recruitment records to Supabase.
- Raspberry Pi Bot should process Web-created records/jobs and perform Discord automation.
- The proof channel system is no longer part of v1 unless reintroduced later.

Canonical design docs:

- `docs/system-design.md`
- `docs/open-decisions.md`