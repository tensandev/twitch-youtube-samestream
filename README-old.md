# 🎮✨ Twitch to YouTube Mirror Stream CLI

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**TwitchからYouTubeへのリアルタイム配信横流しCLIツール** 🚀  
**+ 超便利なTwitchアクセストークン取得ツール付き** 🔑

特定のTwitchチャンネルを監視し、配信が開始されると自動的にYouTubeにミラー配信を行う高機能なコマンドラインアプリケーションです。面倒なTwitch API認証も付属の便利ツールで楽々設定！

## ✨ 特徴

### 🎯 メイン機能
- 🔍 **自動監視**: 指定したTwitchチャンネルの配信状況を定期的にチェック
- 🚀 **リアルタイム転送**: FFmpegを使用した低遅延・高品質な配信転送
- 📺 **YouTube Live統合**: YouTube Live配信の自動作成・管理
- 🖼️ **サムネイル自動設定**: Twitchサムネイルの自動アップロード&カスタムサムネイル対応
- 🎨 **美しいログ**: 絵文字とカラフルなログで状況が一目瞭然
- ⚙️ **設定可能**: 環境変数で細かい設定をカスタマイズ
- 🔄 **自動再試行**: 配信エラー時の自動復旧機能
- 📊 **統計情報**: リアルタイムな配信統計の表示

### 🔑 トークン取得ツール
- 🎨 **美しいWebUI**: ブラウザで直感的にトークン取得
- 🚀 **自動ブラウザ起動**: コマンド一発でブラウザが開く
- ✅ **トークン検証**: 取得したトークンの有効性を自動チェック
- 📋 **設定例表示**: .envに追加する内容を自動生成
- 🔒 **セキュア**: ローカルサーバーで安全に処理

## 🛠️ 前提条件

### 必須ソフトウェア
- **Node.js** (v18以上)
- **FFmpeg** - システムにインストールされている必要があります
  - Windows: [FFmpeg公式サイト](https://ffmpeg.org/download.html)からダウンロード
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`

### API設定
以下のAPIアクセスが必要です：

#### Twitch API
1. [Twitch Developer Console](https://dev.twitch.tv/console)でアプリケーションを作成
2. **Client ID**と**Client Secret**を取得
3. **アクセストークン**を生成（→ 下記の便利ツールで楽々取得！）

#### YouTube API (オプション)
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. YouTube Data API v3を有効化
3. **APIキー**または**OAuth2認証情報**を取得
4. YouTube Live配信の**ストリームキー**を取得

## 📦 インストール

```bash
# リポジトリをクローン
git clone <このリポジトリのURL>
cd twitch-youtube-samestream

# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run build
```

## 🔑 Step 1: Twitchアクセストークンの取得

### 1-1. トークンジェネレーターを起動

```bash
npm run token
```

### 1-2. ブラウザが自動で開く

コマンド実行後、自動的にブラウザで `http://localhost:3000` が開きます。

### 1-3. Twitch Developer Consoleで準備

初回のみ、以下の設定が必要です：

1. [Twitch Developer Console](https://dev.twitch.tv/console) にアクセス
2. 「アプリケーションを登録」をクリック
3. 以下の情報を入力：
   - **名前**: 任意の名前（例: My Stream Mirror App）
   - **OAuth リダイレクト URL**: `http://localhost:3000/callback`
   - **カテゴリ**: Other
4. 「作成」をクリック
5. **クライアントID**をコピー

### 1-4. WebUIでトークン取得

1. コピーしたクライアントIDをWebUIの入力欄に貼り付け
2. 「🚀 認証を開始」ボタンをクリック
3. Twitchの認証ページでログイン・許可
4. 自動的にトークンが取得・表示されます

### 1-5. 実行例

```bash
$ npm run token

🎮✨ Twitch Token Generator が起動しました！
════════════════════════════════════════════════════════════════
🌐 ブラウザでアクセス: http://localhost:3000
🔧 Ctrl+C で停止
════════════════════════════════════════════════════════════════

🔐 Twitchの認証ページにリダイレクトします...
🔍 トークンの有効性をテスト中...
✅ トークンは有効です！
ユーザー名: YourTwitchName
ユーザーID: 123456789

🎉 アクセストークンの取得に成功しました！
════════════════════════════════════════════════════════════════
アクセストークン: abcd1234efgh5678ijkl9012...
トークンタイプ: bearer
スコープ: user:read:email, channel:read:stream_key, ...
════════════════════════════════════════════════════════════════

📝 .envファイルに以下を追加してください:
TWITCH_ACCESS_TOKEN=abcd1234efgh5678ijkl9012...

👋 認証完了！サーバーを停止します...
```

## ⚙️ Step 2: 設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Twitch API設定 (必須)
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here
TWITCH_ACCESS_TOKEN=your_generated_token_from_step1  # ← Step1で取得
TWITCH_CHANNEL_NAME=target_twitch_channel_name

# YouTube API設定 (オプション)
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token_here
YOUTUBE_CHANNEL_ID=your_youtube_channel_id_here

# YouTube Live配信設定 (必須)
YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2/
YOUTUBE_STREAM_KEY=your_youtube_stream_key_here

# アプリケーション設定 (オプション)
CHECK_INTERVAL=30000          # 監視間隔（ミリ秒）
RETRY_COUNT=3                 # 再試行回数
LOG_LEVEL=info               # ログレベル (debug/info/warn/error)
```

## 🎥 Step 3: YouTube API自動設定（オプション）

### 3-1. YouTube設定ツールの起動

```bash
npm run youtube
```

### 3-2. Google Cloud Console設定

コマンド実行後、自動的にブラウザで設定ページが開きます。

#### Google Cloud Console設定手順
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「ライブラリ」で**YouTube Data API v3**を有効化
4. 「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類: **ウェブアプリケーション**
6. 承認済みのリダイレクト URI: `http://localhost:3000/youtube/callback`

### 3-3. WebUIで認証情報を入力

1. OAuth 2.0 クライアント IDを入力
2. OAuth 2.0 クライアント シークレットを入力
3. 「YouTube認証を開始」ボタンをクリック
4. Googleアカウントでログインして承認

### 3-4. 自動設定完了！

認証が完了すると、以下の情報が自動で.envファイルに追加されます：

- `YOUTUBE_CLIENT_ID` - OAuth 2.0 クライアントID
- `YOUTUBE_CLIENT_SECRET` - OAuth 2.0 クライアントシークレット  
- `YOUTUBE_REFRESH_TOKEN` - リフレッシュトークン
- `YOUTUBE_CHANNEL_ID` - チャンネルID

### 3-5. Stream Key設定

YouTube Studioから手動でストリームキーを取得：

1. [YouTube Studio](https://studio.youtube.com/)にアクセス
2. 左メニューから「配信」をクリック
3. 「配信を開始」→「ストリーム」を選択
4. 「ストリームキー」をコピーして.envに追加:
   ```env
   YOUTUBE_STREAM_KEY=your_stream_key_here
   ```

### 3-6. 実行例

```bash
$ npm run youtube

🎥✨ YouTube API自動設定ツール ✨🎥
════════════════════════════════════════════════════════════════
🌐 ブラウザでアクセス: http://localhost:3000
🔧 Ctrl+C で停止
════════════════════════════════════════════════════════════════

🔐 Google認証ページにリダイレクトします...
🔍 YouTube API認証中...
✅ 認証完了！チャンネル情報を取得中...

🎉 YouTube API設定が完了しました！
════════════════════════════════════════════════════════════════
チャンネル名: Your Channel Name
チャンネルID: UC1234567890abcdef...
購読者数: 1,234
════════════════════════════════════════════════════════════════

📝 .envファイルに以下が追加されました:
YOUTUBE_CLIENT_ID=your_client_id...
YOUTUBE_CLIENT_SECRET=your_client_secret...
YOUTUBE_REFRESH_TOKEN=your_refresh_token...
YOUTUBE_CHANNEL_ID=UC1234567890abcdef...

⏩ YouTube Studioでストリームキーを設定してください！
👋 設定完了！サーバーを停止します...
```

###  完全自動セットアップ

Twitch + YouTube両方を一度に設定：

```bash
npm run setup
```

これでTwitchトークン生成 → YouTube API設定が連続で実行されます！

### 🔧 YouTube設定のトラブルシューティング

#### よくあるエラー

1. **「Client IDとClient Secretが必要です」**
   - Google Cloud Consoleで正しくOAuth認証情報を作成してください

2. **「認証がキャンセルされました」**  
   - Googleアカウントでの認証をキャンセルした場合に発生
   - 再度実行してください

3. **「チャンネル情報が見つかりません」**
   - YouTubeチャンネルが作成されていない場合に発生
   - YouTubeでチャンネルを作成してから再実行してください

4. **「ポート3000が使用中です」**
   - 他のアプリが3000番ポートを使用中
   - 他のアプリを停止するか、環境変数でポート変更:
     ```bash
     PORT=3001 npm run youtube
     ```

5. **Google OAuth 403エラー（access_denied）** 🚨
   - **症状**: 「アクセスをブロック: このアプリはGoogleの審査プロセスを完了していません」
   - **原因**: アプリがGoogleの本審査を通っていない（テスト段階）
   
   **🔧 対処法:**
   
   **A) 開発者の場合（推奨）:**
   ```bash
   # Google Cloud Consoleでテストユーザーを追加
   1. https://console.cloud.google.com/ にアクセス
   2. 該当プロジェクトを選択
   3. 「APIとサービス」→「OAuth同意画面」
   4. 下部「テストユーザー」セクションで「+ ADD USERS」
   5. 使用するGmailアドレスを入力して保存
   ```
   
   **B) 一時的な解決策:**
   ```bash
   # OAuth同意画面で「アプリを公開」を一時的に実行
   # ⚠️ 注意: 本番環境では適切な審査を受けてください
   ```
   
   **C) その他のチェック項目:**
   - ✅ 正しいGoogleアカウントでログインしているか確認
   - ✅ ブラウザキャッシュをクリア（Ctrl+Shift+Delete）
   - ✅ シークレットモードで試行
   - ✅ リダイレクトURIが正確に設定されているか確認
     ```
     http://localhost:3000/youtube/callback
     ```

#### デバッグモード

詳細なログを確認したい場合：
```bash
LOG_LEVEL=debug npm run youtube
```

## 🚀 Step 4: YouTubeサムネイル・タイトル自動設定

### 4-1. サムネイル＆タイトル機能の概要

このツールでは、Twitch配信開始時に自動的にYouTubeライブ配信のサムネイルとタイトルを設定できます：

#### 🖼️ サムネイル機能
- **自動サムネイル**: Twitchのサムネイルを自動取得・アップロード
- **カスタムサムネイル**: 独自の画像を常に使用
- **品質設定**: 1080p/720p/480pから選択可能
- **管理ツール**: インタラクティブなサムネイル管理

#### 📝 タイトル機能
- **自動タイトル生成**: Twitchの情報を基に動的にタイトル作成
- **カスタムタイトル**: 固定タイトルの設定
- **テンプレート機能**: プレースホルダーを使った柔軟なフォーマット
- **条件付き要素**: 配信者名、ゲーム名等の表示・非表示制御

### 4-2. 基本設定

`.env`ファイルにサムネイル・タイトル設定を追加：

```env
# ===================
# YouTubeタイトル設定 (オプション)
# ===================
# カスタムタイトルを指定（指定しない場合は自動生成）
# 例: CUSTOM_YOUTUBE_TITLE=【ミラー配信】今日もゲーム配信！
CUSTOM_YOUTUBE_TITLE=

# 自動タイトルフォーマット（カスタムタイトルが空の場合に使用）
# 使用可能なプレースホルダー:
# {title} - Twitchの配信タイトル
# {streamer} - 配信者名  
# {game} - ゲーム名
# {channel} - チャンネル名
# {viewers} - 視聴者数
# {language} - 言語
# {date} - 日付
# {time} - 時刻
# {datetime} - 日時
AUTO_TITLE_FORMAT=[ミラー配信] {title} - {streamer}

# タイトルに含める要素の設定
INCLUDE_STREAMER_NAME=true
INCLUDE_TWITCH_TITLE=true
INCLUDE_GAME_NAME=true

# ===================
# YouTubeサムネイル設定 (オプション)  
# ===================
# サムネイル自動アップロード有効/無効
AUTO_UPLOAD_THUMBNAIL=true

# カスタムサムネイルのパス（オプション）
# 例: CUSTOM_THUMBNAIL_PATH=./thumbnails/my_thumbnail.jpg
CUSTOM_THUMBNAIL_PATH=

# Twitchサムネイルの品質設定（1080p/720p/480p）
THUMBNAIL_QUALITY=1080p
```

### 4-3. タイトル設定詳細

#### A) カスタムタイトルモード

固定のタイトルを常に使用する場合：

```env
# .env設定例（カスタムタイトルモード）
CUSTOM_YOUTUBE_TITLE=【ライブ配信】毎日ゲーム配信中！
AUTO_TITLE_FORMAT=     # 空にしておく
```

**結果例:**
```
配信タイトル: 【ライブ配信】毎日ゲーム配信中！
```

#### B) 自動生成モード（推奨）

Twitchの情報を基に動的にタイトルを生成：

```env
# .env設定例（自動生成モード）
CUSTOM_YOUTUBE_TITLE=  # 空にしておく
AUTO_TITLE_FORMAT=[ミラー配信] {title} - {streamer}
```

**結果例:**
```
Twitchタイトル: "VALORANT Ranked Game"
配信者: "shroud"
→ YouTube: "[ミラー配信] VALORANT Ranked Game - shroud"
```

#### C) 高度なテンプレート例

```env
# ゲーム名も含む
AUTO_TITLE_FORMAT=[{game}] {title} - {streamer}

# 日時も含む
AUTO_TITLE_FORMAT={title} - {streamer} ({date})

# 視聴者数も含む
AUTO_TITLE_FORMAT=[🔴LIVE] {title} - {streamer} ({viewers}人視聴中)

# シンプル版
AUTO_TITLE_FORMAT={streamer}: {title}
```

### 4-4. 使用可能なプレースホルダー

| プレースホルダー | 説明 | 例 |
|----------------|------|-----|
| `{title}` | Twitchの配信タイトル | "VALORANT Ranked" |
| `{streamer}` | 配信者の表示名 | "shroud" |
| `{game}` | ゲーム名 | "VALORANT" |
| `{channel}` | チャンネル名（ID） | "shroud" |
| `{viewers}` | 現在の視聴者数 | "15423" |
| `{language}` | 配信言語 | "en" |
| `{date}` | 日付 | "2025/06/01" |
| `{time}` | 時刻 | "20:30:15" |
| `{datetime}` | 日時 | "2025/06/01 20:30:15" |

### 4-5. 条件付き要素の制御

特定の要素を表示・非表示にする設定：

```env
# 配信者名を含めない場合
INCLUDE_STREAMER_NAME=false
AUTO_TITLE_FORMAT=[ミラー配信] {title}

# ゲーム名を含めない場合  
INCLUDE_GAME_NAME=false
AUTO_TITLE_FORMAT=[ミラー配信] {title} - {streamer}

# Twitchタイトルを含めない場合
INCLUDE_TWITCH_TITLE=false
AUTO_TITLE_FORMAT=[ミラー配信] {streamer}のゲーム配信
```

### 4-6. タイトル設定例とパターン

#### 🎮 ゲーム配信向け

```env
# パターン1: ゲーム重視
AUTO_TITLE_FORMAT=[{game}] {title} - {streamer}
# 結果: [VALORANT] Ranked Game - shroud

# パターン2: 配信者重視  
AUTO_TITLE_FORMAT={streamer}の{game}配信: {title}
# 結果: shroudのVALORANT配信: Ranked Game

# パターン3: シンプル
AUTO_TITLE_FORMAT=[ミラー配信] {streamer}: {title}
# 結果: [ミラー配信] shroud: Ranked Game
```

#### 📺 一般配信向け

```env
# パターン1: 正式版
AUTO_TITLE_FORMAT=【公式ミラー】{title} | {streamer}
# 結果: 【公式ミラー】雑談配信 | ninja

# パターン2: 日時付き
AUTO_TITLE_FORMAT={title} - {streamer} ({date})
# 結果: 雑談配信 - ninja (2025/06/01)

# パターン3: ライブ感
AUTO_TITLE_FORMAT=🔴 {title} | {streamer} LIVE
# 結果: 🔴 雑談配信 | ninja LIVE
```

### 4-7. サムネイル設定詳細

#### A) 自動サムネイルモード

配信開始時にTwitchのサムネイルを自動的にYouTubeにアップロード：

```env
# .env設定例（自動モード）
AUTO_UPLOAD_THUMBNAIL=true
CUSTOM_THUMBNAIL_PATH=
THUMBNAIL_QUALITY=1080p
```

**動作フロー:**
1. Twitch配信検出
2. Twitchサムネイル取得（設定品質で）
3. 一時ファイルとしてダウンロード
4. YouTubeにアップロード
5. 一時ファイル削除

#### B) カスタムサムネイルモード

独自の画像を常に使用する場合：

```env
# .env設定例（カスタムモード）
AUTO_UPLOAD_THUMBNAIL=true
CUSTOM_THUMBNAIL_PATH=./thumbnails/stream_thumbnail.jpg
THUMBNAIL_QUALITY=1080p
```

**サポート形式:**
- **ファイル形式**: JPEG (.jpg, .jpeg), PNG (.png)
- **ファイルサイズ**: 最大2MB
- **推奨解像度**: 1280x720以上 (16:9比率推奨)

### 4-8. 管理ツール

#### サムネイル管理ツールの起動

```bash
npm run thumbnail
```

#### 機能一覧

```bash
🎨✨ YouTube サムネイル管理ツール ✨🎨
════════════════════════════════════════════════════════════════

📋 現在のサムネイル設定:
   自動アップロード: 有効
   品質設定: 1080p
   カスタムサムネイル: 未設定（Twitchサムネイルを使用）

📝 現在のタイトル設定:
   自動フォーマット: "[ミラー配信] {title} - {streamer}"
   配信者名を含む: 有効
   Twitchタイトルを含む: 有効
   ゲーム名を含む: 有効

🎯 メニュー:
1. カスタムサムネイルをアップロード    # 手動でアップロード
2. サムネイル設定を表示               # 現在の設定確認
3. サムネイルフォルダを開く           # ファイル管理
4. 動画のサムネイル情報を取得         # 既存動画の確認
5. 終了
```

### 4-9. 品質とパフォーマンス設定

#### サムネイル品質比較

| 設定値 | 解像度 | 用途 | ファイルサイズ目安 |
|--------|--------|------|------------------|
| `1080p` | 1920x1080 | 最高品質 | 200-800KB |
| `720p` | 1280x720 | 標準品質 | 100-400KB |
| `480p` | 854x480 | 軽量版 | 50-200KB |

#### 設定変更例

```bash
# 高品質設定（推奨）
THUMBNAIL_QUALITY=1080p

# 標準品質設定
THUMBNAIL_QUALITY=720p

# 軽量設定（回線が遅い場合）
THUMBNAIL_QUALITY=480p
```

### 4-10. 実行例とログ

#### 自動設定での実行例

```bash
$ npm start start --channel "shroud"

🎮✨ Twitch to YouTube Mirror Stream ✨🎮
══════════════════════════════════════════════════════════════

✨ [INFO] 監視対象チャンネル: shroud 👁️
✅ [SUCCESS] 認証チェック完了

📸 サムネイル設定:
  自動アップロード: 有効
  品質設定: 1080p
  カスタムサムネイル: 未設定（Twitchサムネイルを使用）

📝 タイトル設定:
  自動フォーマット: "[ミラー配信] {title} - {streamer}"
  配信者名を含む: 有効
  Twitchタイトルを含む: 有効
  ゲーム名を含む: 有効

📁 サムネイルフォルダを作成しました: thumbnails/

🔴 [STREAMING] shroud の配信を検出しました！
💜 [TWITCH] タイトル: VALORANT Ranked
📝 [YOUTUBE] 生成されるタイトル: "[ミラー配信] VALORANT Ranked - shroud"
❤️ [YOUTUBE] YouTube Live配信を準備しました

📸 [YOUTUBE] Twitchのサムネイルを自動アップロード中...
📥 [YOUTUBE] サムネイルダウンロード完了、YouTubeにアップロード中...
📸 [YOUTUBE] 一時ファイルを削除しました
✅ [SUCCESS] サムネイルのアップロードが完了しました

🚀 [STREAMING] ミラー配信が開始されました！
```

#### カスタム設定での実行例

```bash
$ npm start start --channel "ninja"

📝 タイトル設定:
  カスタムタイトル: "【毎日配信】ゲーム実況ライブ！"
  配信者名を含む: 有効
  Twitchタイトルを含む: 無効
  ゲーム名を含む: 有効

📸 サムネイル設定:
  自動アップロード: 有効
  品質設定: 1080p
  カスタムサムネイル: ./thumbnails/ninja_stream.jpg ✅

🔴 [STREAMING] ninja の配信を検出しました！
📝 [YOUTUBE] 使用されるタイトル: "【毎日配信】ゲーム実況ライブ！"
❤️ [YOUTUBE] YouTube Live配信を準備しました

📸 [YOUTUBE] カスタムサムネイルをアップロード中...
✅ [SUCCESS] サムネイルのアップロードが完了しました
```

### 4-11. トラブルシューティング

#### よくあるエラーと対処法

**1. タイトルが長すぎる**
```bash
# 自動的に切り詰められます
⚠️ タイトルが100文字を超えています。自動的に切り詰められます。
💡 対処法: AUTO_TITLE_FORMATを短くしてください
```

**解決例:**
```env
# 長すぎる例
AUTO_TITLE_FORMAT=[ミラー配信][{date}] {title} - {streamer}さんの{game}配信({viewers}人視聴中)

# 改善例  
AUTO_TITLE_FORMAT=[{game}] {title} - {streamer}
```

**2. プレースホルダーが置換されない**
```bash
💡 対処法: 正しいプレースホルダー名を使用してください
```

**正しい使用例:**
```env
# ❌ 間違い
AUTO_TITLE_FORMAT=[ミラー配信] {タイトル} - {配信者}

# ✅ 正しい
AUTO_TITLE_FORMAT=[ミラー配信] {title} - {streamer}
```

**3. 「カスタムサムネイル機能が無効になっています」**
```bash
❌ エラーコード: 403
💡 対処法: YouTube Studio > チャンネル > 機能の利用資格 
          でカスタムサムネイル機能を有効にしてください
```

**解決手順:**
1. [YouTube Studio](https://studio.youtube.com/)にアクセス
2. 左メニューから「設定」→「チャンネル」
3. 「機能の利用資格」タブをクリック
4. 「カスタムサムネイル」を有効化
5. 電話番号認証が必要な場合は完了させる

### 4-12. 高度な設定例

#### 条件付きタイトル（複雑なケース）

```env
# ゲーム名が存在する場合のみ含める
AUTO_TITLE_FORMAT=[ミラー配信] {title} {game ? "(" + game + ")" : ""} - {streamer}

# 視聴者数が多い場合にバッジを付ける  
AUTO_TITLE_FORMAT={viewers > 1000 ? "🔥" : ""} {title} - {streamer}

# 時間帯による自動調整
AUTO_TITLE_FORMAT={time < "12:00" ? "【朝配信】" : time < "18:00" ? "【昼配信】" : "【夜配信】"} {title}
```

**注意:** 上記の高度な例は将来のアップデートで対応予定です。現在は基本的なプレースホルダーのみサポートしています。

## 🚀 Step 5: 配信アーカイブ自動処理機能

### 5-1. アーカイブ機能の概要

配信終了後に自動的にYouTube動画のプライバシー設定とメタデータを更新する機能です：

#### 🎯 主要機能
- **自動プライバシー設定**: 配信終了後にpublic/unlisted/privateを自動設定
- **タイトル自動更新**: アーカイブ用タイトルに自動変更
- **説明文自動追加**: 配信情報を含む説明文を自動生成
- **配信時間計算**: 配信開始から終了までの時間を自動算出

### 5-2. 基本設定

`.env`ファイルにアーカイブ設定を追加：

```env
# ===================
# アーカイブ設定 (オプション)
# ===================
# 配信終了後のアーカイブ動画のプライバシー設定
# public - 公開, unlisted - 限定公開, private - 非公開
ARCHIVE_PRIVACY_STATUS=public

# アーカイブ処理を有効にするかどうか（true/false）
ENABLE_ARCHIVE_PROCESSING=true

# アーカイブタイトルのフォーマット
# {originalTitle} - 配信時のタイトル, {date} - 配信日, {duration} - 配信時間
ARCHIVE_TITLE_FORMAT=[アーカイブ] {originalTitle} - {date}

# アーカイブ説明文のテンプレート
ARCHIVE_DESCRIPTION_TEMPLATE=この動画は{date}に行われたライブ配信のアーカイブです。
配信者: {streamer}
ゲーム: {game}
配信時間: {duration}

元の配信: https://www.twitch.tv/{channel}
```

### 5-3. アーカイブタイトル設定

#### 使用可能なプレースホルダー

| プレースホルダー | 説明 | 例 |
|----------------|------|-----|
| `{originalTitle}` | 配信時のタイトル | "VALORANT Ranked Game" |
| `{date}` | 配信日（YYYY/M/D形式） | "2025/6/1" |
| `{duration}` | 配信時間 | "2時間30分" |
| `{streamer}` | 配信者名 | "shroud" |
| `{game}` | ゲーム名 | "VALORANT" |
| `{channel}` | チャンネル名 | "shroud" |

#### タイトルフォーマット例

```env
# 基本的なアーカイブタイトル
ARCHIVE_TITLE_FORMAT=[アーカイブ] {originalTitle} - {date}
# 結果: [アーカイブ] VALORANT Ranked Game - 2025/6/1

# 配信時間を含む
ARCHIVE_TITLE_FORMAT=[録画] {originalTitle} ({duration}) - {date}
# 結果: [録画] VALORANT Ranked Game (2時間30分) - 2025/6/1

# 配信者名を含む
ARCHIVE_TITLE_FORMAT={streamer}の配信アーカイブ: {originalTitle} - {date}
# 結果: shroudの配信アーカイブ: VALORANT Ranked Game - 2025/6/1
```

### 5-4. プライバシー設定

#### 設定値と用途

```env
# 公開設定（一般的）
ARCHIVE_PRIVACY_STATUS=public

# 限定公開（URLを知っている人のみ）
ARCHIVE_PRIVACY_STATUS=unlisted

# 非公開（自分のみ）
ARCHIVE_PRIVACY_STATUS=private
```

### 5-5. アーカイブ処理の動作フロー

1. **配信開始検出** → 配信開始時刻を記録
2. **配信終了検出** → アーカイブ処理を自動実行
3. **プライバシー設定更新** → 指定した公開設定に変更
4. **タイトル更新** → アーカイブ用タイトルに変更
5. **説明文更新** → 配信情報を含む説明文を追加

### 5-6. テスト機能

#### アーカイブ処理のテスト

```bash
# アーカイブ設定の確認とテスト実行
npm run test:archive
```

#### 実行例

```bash
$ npm run test:archive

🎬 アーカイブ処理機能のテストを開始...
✅ YouTube認証確認済み

📋 現在のアーカイブ設定:
  プライバシー設定: public
  アーカイブ処理: 有効
  タイトルフォーマット: [アーカイブ] {originalTitle} - {date}

🧪 アーカイブタイトル・説明文生成テスト:
📝 生成されたアーカイブタイトル:
  "[アーカイブ] VALORANT Ranked - 2025/6/1"

📄 生成されたアーカイブ説明文:
"この動画は2025/6/1に行われたライブ配信のアーカイブです。
配信者: tensandev
ゲーム: Apex Legends
配信時間: 2時間30分

元の配信: https://www.twitch.tv/tensandev"

✅ アーカイブ処理機能のテストが完了しました！
```

#### 実際の動画でのテスト

```bash
# 特定の動画IDでアーカイブ処理をテスト
node tests/test-archive-processing.js YOUR_VIDEO_ID
```

### 5-7. 実行時ログ例

```bash
$ npm start

🎮✨ Twitch to YouTube Mirror Stream ✨🎮
══════════════════════════════════════════════════════════════

📁 [ARCHIVE] アーカイブ設定:
  プライバシー設定: public
  アーカイブ処理: 有効

🔴 [STREAMING] 配信開始を検出...
🚀 [STREAMING] ミラー配信が開始されました！

⏹️ [STREAMING] 配信終了を検出...
📁 [ARCHIVE] アーカイブ処理を開始します...
📝 [ARCHIVE] タイトルを更新: "[アーカイブ] VALORANT Ranked - 2025/6/1"
🔒 [ARCHIVE] プライバシー設定を更新: public
📄 [ARCHIVE] 説明文を更新完了
✅ [ARCHIVE] アーカイブ処理が完了しました！
```

### 5-8. 設定のカスタマイズ例

#### ゲーム配信向け

```env
ARCHIVE_PRIVACY_STATUS=public
ARCHIVE_TITLE_FORMAT=[{game}アーカイブ] {originalTitle} - {date}
ARCHIVE_DESCRIPTION_TEMPLATE=📹 {date}のライブ配信アーカイブ

🎮 ゲーム: {game}
👤 配信者: {streamer}
⏱️ 配信時間: {duration}
🔗 元配信: https://www.twitch.tv/{channel}

#ライブ配信 #{game} #アーカイブ
```

#### チュートリアル配信向け

```env
ARCHIVE_PRIVACY_STATUS=unlisted
ARCHIVE_TITLE_FORMAT=[教材] {originalTitle} - {date}
ARCHIVE_DESCRIPTION_TEMPLATE=📚 学習用アーカイブ動画

配信日: {date}
内容: {originalTitle}
配信時間: {duration}

このアーカイブは学習目的で保存されています。
```

### 5-9. 注意事項

- アーカイブ処理は配信終了後に**自動実行**されます
- YouTube API の制限により、処理に数秒かかる場合があります
- `ENABLE_ARCHIVE_PROCESSING=false` で機能を無効化できます
- タイトルは100文字、説明文は5000文字以内に自動調整されます

## 🚀 Step 6: 配信監視の開始

### 配信監視を開始

```bash
# デフォルトチャンネルを監視
npm start start

# または特定のチャンネルを指定
npm start start --channel "ChannelName"
```

### 配信テスト

```bash
# 指定チャンネルの配信状況をテスト
npm start test ChannelName
```

### 現在の状態を確認

```bash
# 配信状態を表示
npm start status
```

### 設定確認

```bash
# 現在の設定を確認
npm start config
```

### 配信停止

```bash
# 実行中の配信監視とミラー配信を停止
npm run stop
```

このコマンドは以下の処理を実行します：
- アクティブなYouTube Live配信を終了（'complete'ステータスに移行）
- FFmpegによるミラー配信を停止
- 監視プロセスを終了
- リソースをクリーンアップ

## 📋 利用可能なコマンド

### 設定管理
```bash
npm run config          # 設定の詳細表示とプレビュー
npm run setup           # 初期設定（Twitch + YouTube認証）
```

### 配信制御
```bash
npm start               # 配信監視開始
npm run start -- --help # 詳細なオプション表示
```

### 開発・デバッグ
```bash
npm run build           # TypeScriptをビルド
npm run dev             # 開発モード（ソース監視）
```

### API管理
```bash
npm run token:auto      # Twitchトークン自動取得
npm run token:validate  # Twitchトークン検証
npm run youtube         # YouTube API設定
npm run thumbnail       # サムネイル管理ツール
```

## 🎯 使用例

### 完全な流れ

```bash
# 1. まずトークンを取得
npm run token
# → WebUIでClient IDを入力してトークン取得

# 2. YouTube API設定（オプション）
npm run youtube
# → Google OAuth認証でYouTube連携

# 3. .envファイルに設定を追加・確認
# → 取得したトークンとサムネイル設定を記述
#   AUTO_UPLOAD_THUMBNAIL=true
#   THUMBNAIL_QUALITY=1080p
#   CUSTOM_THUMBNAIL_PATH=./thumbnails/my_thumbnail.jpg

# 4. サムネイル管理（オプション）
npm run thumbnail
# → カスタムサムネイルのアップロードや設定確認

# 5. 配信をテスト
npm start test "shroud"

# 6. 問題なければ監視開始（サムネイル自動設定付き）
npm start start --channel "shroud"

# 7. 別のターミナルで状態確認
npm start status

# 8. 配信停止（YouTube Live配信も自動終了）
npm run stop
```

### サムネイル機能付き実行例

```bash
# カスタムサムネイルを設定
echo "AUTO_UPLOAD_THUMBNAIL=true" >> .env
echo "CUSTOM_THUMBNAIL_PATH=./thumbnails/stream_logo.jpg" >> .env
echo "THUMBNAIL_QUALITY=1080p" >> .env

# サムネイル管理ツールで事前アップロード
npm run thumbnail

# 配信監視開始（自動サムネイル付き）
npm start start --channel "ninja"
```

### 実行ログの例

```
🎮✨ Twitch to YouTube Mirror Stream ✨🎮
══════════════════════════════════════════════════════════════

✨ [INFO] 監視対象チャンネル: shroud 👁️
✅ [SUCCESS] 認証チェック完了
✨ [INFO] Node Media Serverが開始されました
✨ [INFO] RTMP: rtmp://localhost:1935
✨ [INFO] HTTP: http://localhost:8000
🚀 [INFO] 🔍 配信監視を開始しました...
⏰ [INFO] 30秒間隔で監視中...

🔴 [STREAMING] shroud の配信を検出しました！
💜 [TWITCH] タイトル: VALORANT Ranked
📊 [STATS]
  タイトル: VALORANT Ranked
  ゲーム: VALORANT
  視聴者数: 15,423
  開始時刻: 2025/05/29 20:30:15
  言語: en

✅ [SUCCESS] プレイリストURLを取得しました: shroud
🚀 [STREAMING] ミラー配信が開始されました！
```

## 🔧 高度な設定

### トークン取得ツールのカスタマイズ

#### カスタムポート

デフォルトのポート3000が使用中の場合：

```bash
PORT=8080 npm run token
```

#### 追加スコープの設定

より多くの権限が必要な場合は、`tools/generate-twitch-token.ts`の`scopes`配列を編集：

```typescript
private scopes: string[] = [
  'user:read:email',
  'channel:read:stream_key',
  'channel:read:subscriptions',
  'bits:read',
  'channel:read:hype_train',
  // 追加したいスコープをここに
  'channel:moderate',
  'chat:read',
  'chat:edit'
];
```

### FFmpeg設定のカスタマイズ

`src/services/StreamService.ts`の`buildFFmpegArgs`メソッドを編集して、FFmpegパラメータをカスタマイズできます：

```typescript
private buildFFmpegArgs(inputUrl: string, outputUrl: string): string[] {
  return [
    // 入力設定
    '-i', inputUrl,
    '-reconnect', '1',
    
    // ビデオ設定（カスタマイズ可能）
    '-c:v', 'libx264',
    '-preset', 'faster',      // 速度優先: ultrafast, superfast, veryfast, faster
    '-crf', '20',             // 品質: 18-28（低いほど高品質）
    '-maxrate', '8000k',      // 最大ビットレート
    '-bufsize', '16000k',
    
    // オーディオ設定
    '-c:a', 'aac',
    '-b:a', '192k',           // 音声ビットレート
    
    // 出力設定
    '-f', 'flv',
    outputUrl,
  ];
}
```

### 監視間隔の調整

```env
# より頻繁にチェック（15秒間隔）
CHECK_INTERVAL=15000

# 負荷を下げる（60秒間隔）
CHECK_INTERVAL=60000
```

## 🐛 トラブルシューティング

### よくある問題

#### 1. FFmpegが見つからない
```bash
# FFmpegのインストール確認
ffmpeg -version

# パスが通っていない場合
export PATH=$PATH:/path/to/ffmpeg
```

#### 2. Twitch認証エラー
```bash
# トークンの有効性確認
npm start test YourChannelName

# 新しいトークンを取得
npm run token
```

#### 3. トークン取得ツールのトラブル

##### ブラウザが開かない
```bash
# 手動でアクセス
http://localhost:3000
```

##### ポートが使用中
```bash
# 別のポートを使用
PORT=8080 npm run token
```

##### リダイレクトURL不一致
Twitch Developer Consoleで以下を確認：
- OAuth リダイレクト URL: `http://localhost:3000/callback`
- ポートを変更した場合は、Developer Consoleも更新

##### Client IDが無効
- Client IDの長さを確認（通常30文字程度）
- コピー時の余分な空白を除去
- Developer Consoleで再度確認

#### 4. YouTube配信が作成されない
- YouTube APIの認証情報を確認
- YouTube Liveが有効になっているか確認
- ストリームキーが正しいか確認

#### 5. 配信が頻繁に切断される
```env
# 再試行回数を増やす
RETRY_COUNT=5

# より安定した設定
CHECK_INTERVAL=60000
```

### ログレベルの変更

詳細なデバッグ情報を表示：

```env
LOG_LEVEL=debug
```

## 📚 開発

### 開発環境のセットアップ

```bash
# 開発モードで実行
npm run dev start --channel "ChannelName"

# TypeScriptの監視モード
npm run watch

# ビルド
npm run build
```

### プロジェクト構造

```
twitch-youtube-samestream/
├── 📁 src/                     # メインアプリケーション
│   ├── 📁 services/            # コアサービス
│   │   ├── TwitchService.ts        # Twitch API統合
│   │   ├── YouTubeService.ts       # YouTube API統合
│   │   └── StreamService.ts        # ストリーミング制御
│   ├── 📁 utils/               # ユーティリティ
│   │   ├── config.ts               # 設定管理
│   │   └── logger.ts               # ログ機能
│   ├── 📁 types/               # 型定義
│   │   ├── index.ts                # 主要な型
│   │   └── declarations.d.ts       # 外部ライブラリ型
│   └── 📄 index.ts             # メインアプリ
├── 📁 tools/                   # ツール類
│   └── 📄 generate-twitch-token.ts # トークン取得ツール
├── 📁 dist/                    # コンパイル済みJS
├── 📄 package.json             # 依存関係・スクリプト
├── 📄 tsconfig.json            # TypeScript設定
├── 📄 .env.example             # 設定例
├── 📄 LICENSE                  # MITライセンス
└── 📄 README.md                # このファイル
```

## 🔑 取得されるトークンスコープ

トークン取得ツールでは以下のスコープでトークンを取得します：

| スコープ | 説明 |
|---------|------|
| `user:read:email` | ユーザー情報の読み取り |
| `channel:read:stream_key` | ストリームキーの読み取り |
| `channel:read:subscriptions` | サブスクリプション情報の読み取り |
| `bits:read` | Bits情報の読み取り |
| `channel:read:hype_train` | Hype Train情報の読み取り |

## ⚠️ 注意事項

- **著作権**: 配信内容の著作権を尊重し、適切な許可を得てから使用してください
- **利用規約**: TwitchとYouTubeの利用規約を遵守してください
- **帯域幅**: 大量の帯域幅を使用するため、インターネット接続を確認してください
- **システム負荷**: FFmpegは高いCPU使用率を示すことがあります
- **セキュリティ**: トークンはローカルサーバーでのみ処理され、外部に送信されません

## 🤝 コントリビューション

プルリクエストや課題報告は大歓迎です！

1. フォークしてください
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開いてください

## 📜 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Twitch API](https://dev.twitch.tv/) - 配信データの提供
- [YouTube Data API](https://developers.google.com/youtube/v3) - YouTube統合
- [FFmpeg](https://ffmpeg.org/) - ストリーミング処理
- [Node Media Server](https://github.com/illuspas/Node-Media-Server) - RTMP処理

---

**作成者**: スタテン 
**バージョン**: 1.1.0  
**最終更新**: 2025年6月1日

🎮✨ **Happy Streaming & Token Generating!** ✨🎮
