# Discord募集Bot 常時起動

プロフィールサイトはVercelで動かしたままでOKです。
Discord BotはGatewayへ接続し続ける常駐プロセスなので、VercelではなくRailway、Render、Fly.io、VPSなどで `npm run bot:start` を起動し続けます。

## Railwayで動かす場合

1. Railwayで新しいProjectを作る
2. GitHubリポジトリを接続する
3. ServiceのStart Commandを次にする

```bash
npm run bot:start
```

このリポジトリには `railway.json` を入れてあるので、Railwayが読める場合はStart Commandが自動で入ります。

4. Variablesに以下を入れる

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=1512959339336568883
AUTH_DISCORD_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RECRUITMENT_CHANNEL_ID=...
OPERATIONS_ROLE_ID=...
```

5. 必要ならカテゴリIDも入れる

```env
PROOF_CATEGORY_ID=...
APPLICATION_CATEGORY_ID=...
PARTY_CATEGORY_ID=...
PUBLIC_VC_CATEGORY_ID=...
```

カテゴリIDを入れない場合、Botが次のカテゴリ名で探して、なければ作成します。

```env
PROOF_CATEGORY_NAME=証明チャンネル
APPLICATION_CATEGORY_NAME=募集申請
PARTY_CATEGORY_NAME=パーティ
```

6. Deployする
7. Logsに次が出れば起動成功

```text
Logged in as ...
```

## Renderで動かす場合

Service typeはWeb ServiceではなくBackground Workerを選び、Start Commandを次にします。

```bash
npm run bot:start
```

環境変数はRailwayと同じです。

## 起動前に一度だけ実行

Supabase SQL Editorで次を実行してください。

```text
supabase/bot_v1.sql
```

Discordコマンド登録はローカルまたはデプロイ先で次を実行します。

```bash
npm run bot:register
```

登録済みなら毎回実行する必要はありません。

## Oracle Cloud Always Freeで動かす場合

Oracle CloudのAlways Free VMにSSHで入り、Node.js Botをsystemdで常時起動します。

### 1. VMを作成

Oracle CloudでCompute Instanceを作成します。

- Image: Oracle Linux 8/9 または Ubuntu
- Shape: Always Free対象
- Public SSH keyを登録

### 2. VMにSSH

```bash
ssh opc@PUBLIC_IP
```

Ubuntuの場合はユーザー名が `ubuntu` になることがあります。

### 3. Node.jsとGitを入れる

Oracle Linux系:

```bash
sudo dnf update -y
sudo dnf install -y git nodejs npm
```

Ubuntu系:

```bash
sudo apt update
sudo apt install -y git nodejs npm
```

### 4. リポジトリを置く

```bash
git clone YOUR_GITHUB_REPO_URL ~/bpsr
cd ~/bpsr
npm ci
```

### 5. .envを作る

```bash
nano .env
```

最低限これを入れます。

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=1512959339336568883
AUTH_DISCORD_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RECRUITMENT_CHANNEL_ID=...
OPERATIONS_ROLE_ID=...
```

### 6. Discordコマンド登録

```bash
npm run bot:register
```

### 7. 動作確認

```bash
npm run bot:start
```

`Logged in as ...` が出たら `Ctrl+C` で止めます。

### 8. systemdで常時起動

```bash
sudo cp bot/oracle-bpsr-bot.service.example /etc/systemd/system/bpsr-bot.service
sudo systemctl daemon-reload
sudo systemctl enable bpsr-bot
sudo systemctl start bpsr-bot
```

状態確認:

```bash
sudo systemctl status bpsr-bot
```

ログ確認:

```bash
journalctl -u bpsr-bot -f
```

更新するとき:

```bash
cd ~/bpsr
git pull
npm ci
sudo systemctl restart bpsr-bot
```
## Google Cloud Free Tierで動かす場合

Google CloudのCompute Engine無料枠VMにSSHで入り、Node.js Botをsystemdで常時起動します。

### 無料枠で選ぶ設定

- Machine type: e2-micro
- Region: us-west1 / us-central1 / us-east1 のどれか
- Disk: Standard persistent disk 30GB以内
- OS: Ubuntu LTS推奨

東京リージョンなど、上記以外のリージョンは無料枠外になる可能性があります。

### 1. VMを作成

Google Cloud Consoleで Compute Engine > VM instances > Create instance を開きます。

推奨:

```text
Name: bpsr-bot
Region: us-west1, us-central1, us-east1 のどれか
Machine type: e2-micro
Boot disk: Ubuntu LTS
Disk type: Standard persistent disk
Disk size: 30GB以内
```

Discord Botは外部からHTTPアクセスを受けないので、HTTP/HTTPS firewall許可は不要です。

### 2. SSHで入る

Google Cloud ConsoleのVM一覧からSSHボタンを押します。

### 3. 専用ユーザーを作る

```bash
sudo useradd -m -s /bin/bash bpsr
sudo usermod -aG sudo bpsr
sudo su - bpsr
```

### 4. Node.jsとGitを入れる

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 5. リポジトリを置く

```bash
git clone YOUR_GITHUB_REPO_URL ~/bpsr
cd ~/bpsr
npm ci
```

### 6. .envを作る

```bash
nano .env
```

最低限これを入れます。

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=1512959339336568883
AUTH_DISCORD_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RECRUITMENT_CHANNEL_ID=...
OPERATIONS_ROLE_ID=...
```

### 7. Discordコマンド登録

```bash
npm run bot:register
```

### 8. 動作確認

```bash
npm run bot:start
```

`Logged in as ...` が出たら `Ctrl+C` で止めます。

### 9. systemdで常時起動

```bash
exit
sudo cp /home/bpsr/bpsr/bot/google-cloud-bpsr-bot.service.example /etc/systemd/system/bpsr-bot.service
sudo systemctl daemon-reload
sudo systemctl enable bpsr-bot
sudo systemctl start bpsr-bot
```

状態確認:

```bash
sudo systemctl status bpsr-bot
```

ログ確認:

```bash
journalctl -u bpsr-bot -f
```

更新するとき:

```bash
sudo su - bpsr
cd ~/bpsr
git pull
npm ci
exit
sudo systemctl restart bpsr-bot
```
## Raspberry Pi 5で動かす場合

Raspberry Pi OS Lite 64-bitにNode.jsを入れて、systemdでDiscord Botを常時起動します。

### 推奨構成

- Raspberry Pi 5 4GB以上
- Raspberry Pi OS Lite 64-bit
- 有線LAN推奨
- High Endurance microSDまたはSSD
- 公式相当の電源アダプタ

### 1. OS更新とNode.js導入

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 2. リポジトリを置く

```bash
git clone YOUR_GITHUB_REPO_URL ~/bpsr
cd ~/bpsr
npm ci
```

### 3. .envを作る

```bash
nano .env
```

最低限これを入れます。

```env
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=1512959339336568883
AUTH_DISCORD_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RECRUITMENT_CHANNEL_ID=...
OPERATIONS_ROLE_ID=...
```

### 4. Discordコマンド登録

```bash
npm run bot:register
```

### 5. 起動確認

```bash
npm run bot:start
```

`Logged in as ...` が出たら `Ctrl+C` で止めます。

### 6. systemdで常時起動

```bash
sudo cp bot/raspberry-pi-bpsr-bot.service.example /etc/systemd/system/bpsr-bot.service
sudo systemctl daemon-reload
sudo systemctl enable bpsr-bot
sudo systemctl start bpsr-bot
```

状態確認:

```bash
sudo systemctl status bpsr-bot
```

ログ確認:

```bash
journalctl -u bpsr-bot -f
```

更新するとき:

```bash
cd ~/bpsr
git pull
npm ci
sudo systemctl restart bpsr-bot
```