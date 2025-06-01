# 🎮✨ Twitch YouTube Mirror Stream CLI

> **TwitchからYouTubeへの自動ミラーストリーミングツール**  
> リアルタイムでTwitchの配信をYouTubeにミラーリングする、フル機能搭載のCLIアプリケーション

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2%2B-blue.svg)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Required-red.svg)](https://ffmpeg.org/)

## 📋 目次

- [✨ 特徴](#-特徴)
- [🚀 クイックスタート](#-クイックスタート)
- [📦 インストール](#-インストール)
- [⚙️ 設定](#-設定)
  - [環境変数の設定](#環境変数の設定)
  - [Twitch API設定](#twitch-api設定)
  - [YouTube API設定](#youtube-api設定)
- [🎯 使い方](#-使い方)
- [📚 コマンドリファレンス](#-コマンドリファレンス)
- [🔧 高度な設定](#-高度な設定)
- [🧪 テスト](#-テスト)
- [🛠️ トラブルシューティング](#️-トラブルシューティング)
- [📈 パフォーマンス最適化](#-パフォーマンス最適化)
- [🤝 コントリビューション](#-コントリビューション)
- [📄 ライセンス](#-ライセンス)

## ✨ 特徴

### 🔄 **リアルタイムミラーリング**
- Twitchの配信状態を自動監視（30秒間隔でチェック、カスタマイズ可能）
- 配信開始時に即座にYouTubeへミラーリング開始
- 配信終了時の自動停止とクリーンアップ
- 配信中断時の自動再接続機能

### 🎥 **高品質な映像伝送**
- FFmpegを使用した高品質なRTMPストリーミング
- カスタマイズ可能なビットレート設定（1080p、720p、480p対応）
- 複数解像度対応と自動品質調整
- 低遅延ストリーミング最適化

### 🔑 **簡単な認証管理**
- Twitch OAuthトークンの自動生成・管理
- YouTube API認証の簡単セットアップ
- トークンの自動更新機能
- セキュアな認証情報保存

### 📊 **詳細なログ機能**
- リアルタイムストリーミング状況の監視
- エラーログと詳細な診断情報
- カスタマイズ可能なログレベル（debug、info、warn、error）
- ログファイル出力対応

### ⚡ **CLI操作**
- 分かりやすいコマンドラインインターフェース
- バックグラウンド実行対応
- 設定ファイル管理ツール
- 豊富なユーティリティコマンド

## 🚀 クイックスタート

### 📋 前提条件

1. **Node.js 18以上**がインストールされていること
2. **FFmpeg**がシステムにインストールされていること
3. **Twitchアカウント**（Developer Console利用可能）
4. **Googleアカウント**（YouTube API利用可能）

### ⚡ セットアップ

```bash
# 1. プロジェクトをクローン
git clone https://github.com/tensandev/twitch-youtube-samestream.git
cd twitch-youtube-samestream

# 2. 依存関係をインストール
npm install

# 3. 環境変数をセットアップ
cp .env.example .env
# .envファイルを編集（後述の設定セクション参照）

# 4-1. ツイッチのセットアップを実行
npm run token
# 4-2. YouTubeのセットアップを実行
npm run setup

# 5. 配信開始！
npm start start
```

## 📦 インストール

### 🔧 システム要件

| 項目 | 最小要件 | 推奨 |
|------|----------|------|
| Node.js | 18.0.0+ | 20.0.0+ |
| npm | 9.0.0+ | 10.0.0+ |
| RAM | 2GB | 4GB+ |
| CPU | 2コア | 4コア+ |
| ネットワーク | 5Mbps上り | 10Mbps+ |

### 📥 FFmpegのインストール

#### Windows
```bash
# Chocolateyを使用（推奨）
choco install ffmpeg

# または公式サイトからダウンロード
# https://ffmpeg.org/download.html#build-windows
```

#### macOS
```bash
# Homebrewを使用
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

#### CentOS/RHEL
```bash
sudo yum install epel-release
sudo yum install ffmpeg
```

#### Arch Linux
```bash
sudo pacman -S ffmpeg
```

## ⚙️ 設定

### 環境変数の設定

`.env`ファイルを編集して、必要な認証情報を設定します（設定に必要な手順は後述）：

```bash
# ========================
# Twitch API設定 (必須)
# ========================
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here
TWITCH_ACCESS_TOKEN=your_twitch_access_token_here
TWITCH_CHANNEL_NAME=monitoring_channel_name

# ========================
# YouTube API設定 (必須)
# ========================
YOUTUBE_API_KEY=your_youtube_api_key_here
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token_here
YOUTUBE_CHANNEL_ID=your_youtube_channel_id_here

# ========================
# YouTube配信設定 (必須)
# ========================
YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2/
YOUTUBE_STREAM_KEY=your_youtube_stream_key_here

# ========================
# アプリケーション設定 (オプション)
# ========================
CHECK_INTERVAL=30000
RETRY_COUNT=3
LOG_LEVEL=info
```

### Twitch API設定

#### 🔹 ステップ1: Twitch Developer Consoleでアプリを作成

1. [Twitch Developer Console](https://dev.twitch.tv/console)にアクセス
2. Twitchアカウントでログイン
3. **二段階認証を有効化**（必須）
4. 「アプリケーションを登録」をクリック

#### 🔹 ステップ2: アプリケーション設定

| 設定項目 | 値 |
|----------|-----|
| 名前 | `Twitch YouTube Mirror Stream` |
| OAuth リダイレクト URL | `http://localhost:3000/callback` |
| カテゴリ | `Other` |

#### 🔹 ステップ3: 認証情報取得

1. 作成されたアプリの「管理」をクリック
2. **Client ID**をコピーして`.env`の`TWITCH_CLIENT_ID`に設定
3. 「新しいシークレット」をクリックして**Client Secret**を取得
4. Client Secretを`.env`の`TWITCH_CLIENT_SECRET`に設定

#### 🔹 ステップ4: アクセストークン取得

**取得コマンド：**
```bash
npm run token
```

ブラウザが開いて認証画面が表示されるので、指示に従って認証を完了してください。

### YouTube API設定

#### 🔹 ステップ1: Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」に移動
4. 「YouTube Data API v3」を検索して有効化

#### 🔹 ステップ2: 認証情報作成

**APIキーの作成：**
1. 「認証情報」→「認証情報を作成」→「APIキー」
2. 作成されたAPIキーを`.env`の`YOUTUBE_API_KEY`に設定

**OAuth 2.0の設定：**
1. 「認証情報を作成」→「OAuth 2.0 クライアントID」
2. アプリケーションの種類: 「ウェブアプリケーション」
3. 承認済みリダイレクトURI: `http://localhost:3000/auth/callback`
4. Client IDとClient Secretを`.env`に設定

#### 🔹 ステップ3: YouTube配信設定

1. [YouTube Studio](https://studio.youtube.com/)にアクセス
2. 「配信」→「ストリーム」
3. 新しいストリームを作成
4. **ストリームキー**をコピーして`.env`の`YOUTUBE_STREAM_KEY`に設定

#### 🔹 ステップ4: YouTubeリフレッシュトークンの自動設定

```bash
npm run youtube
```

ブラウザで認証を完了すると、必要なトークンが自動的に取得、設定されます。

## 🎯 使い方

### 🚀 基本的な使用方法

#### 配信の開始
```bash
# 通常で実行
npm start start

# 開発モード（TypeScript直接実行）
npm run dev
```

#### 配信の停止

##### キーでの停止（推奨）
```bash
# Ctrl + Cで停止
```

##### コマンドでの停止（別プロセスでの実行時）

```bash
npm run stop
```

#### 設定の確認
```bash
npm run config
```

### 🔧 高度な使用方法

#### カスタム設定での起動
```bash
# 特定のチャンネルを監視
TWITCH_CHANNEL_NAME=specific_channel npm start

# ログレベルをデバッグに設定
LOG_LEVEL=debug npm start

# チェック間隔をカスタム設定
CHECK_INTERVAL=10000 npm start
```

#### トークン管理
```bash
# トークンの状態確認
npm run token:info

# トークンの有効性確認
npm run token:validate

# トークンのクリア
npm run token:clear
```

## 📚 コマンドリファレンス

### 🎮 メインコマンド

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `npm start` | 配信監視を開始 | `npm start` |
| `npm run stop` | 配信を停止 | `npm run stop` |
| `npm run dev` | 開発モードで実行 | `npm run dev` |
| `npm run build` | TypeScriptをコンパイル | `npm run build` |
| `npm run watch` | ファイル変更を監視してコンパイル | `npm run watch` |

### 🔑 認証管理コマンド

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `npm run token` | Twitchトークンを手動取得 | `npm run token` |
| `npm run token:auto` | Twitchトークンを自動取得 | `npm run token:auto` |
| `npm run token:get` | 現在のトークンを表示 | `npm run token:get` |
| `npm run token:validate` | トークンの有効性を確認 | `npm run token:validate` |
| `npm run token:info` | トークンの詳細情報を表示 | `npm run token:info` |
| `npm run token:clear` | 保存されたトークンをクリア | `npm run token:clear` |
| `npm run youtube` | YouTube認証を設定 | `npm run youtube` |

### 🛠️ ユーティリティコマンド

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `npm run thumbnail` | サムネイル管理ツール | `npm run thumbnail` |
| `npm run config` | 設定管理ツール | `npm run config` |
| `npm run setup` | 初期セットアップを実行 | `npm run setup` |

### 🧪 テストコマンド

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `npm run test:archive` | アーカイブ処理をテスト | `npm run test:archive` |

## 🔧 高度な設定

### 📊 ログ設定

ログレベルの設定により、出力される情報の詳細度を調整できます：

```bash
# .envファイルで設定
LOG_LEVEL=debug    # 詳細なデバッグ情報
LOG_LEVEL=info     # 一般的な情報（デフォルト）
LOG_LEVEL=warn     # 警告のみ
LOG_LEVEL=error    # エラーのみ
```

### 🎥 ストリーミング品質設定

FFmpegの詳細設定をカスタマイズする場合、`src/services/StreamService.ts`を編集：

```typescript
// ビットレート設定
const videoBitrate = '2500k';    // 映像ビットレート
const audioBitrate = '128k';     // 音声ビットレート

// 解像度設定
const resolution = '1920x1080';  // フルHD
// const resolution = '1280x720'; // HD
// const resolution = '854x480';  // SD

// フレームレート設定
const framerate = '30';          // 30fps
// const framerate = '60';       // 60fps
```

### 🔄 監視間隔の調整

Twitch配信状態のチェック間隔を調整：

```bash
# .envファイルで設定
CHECK_INTERVAL=30000    # 30秒（デフォルト）
CHECK_INTERVAL=10000    # 10秒（頻繁なチェック）
CHECK_INTERVAL=60000    # 60秒（軽量なチェック）
```

### 🛡️ エラー処理設定

ストリーミングエラー時の再試行回数：

```bash
# .envファイルで設定
RETRY_COUNT=3          # 3回再試行（デフォルト）
RETRY_COUNT=5          # 5回再試行
RETRY_COUNT=1          # 1回のみ再試行
```

## 🧪 テスト

### 🔍 統合テスト

配信フローの全体的なテスト：

```bash
npm run test:archive
```

### 🎯 個別機能テスト

特定の機能をテストするためのテストファイルが`tests/`ディレクトリに用意されています：

```bash
# ストリーム処理のテスト
node tests/test-stream-processing.js

# タイトル生成のテスト
node tests/test-title-generation.js

# YouTube診断のテスト
node tests/test-youtube-diagnostics.js

# アクティブ配信のテスト
node tests/test-active-broadcast.js
```

### 📋 テスト用設定

テスト環境用の設定ファイル`.env.test`を作成することを推奨：

```bash
cp .env .env.test
# テスト用の値に編集
```

## 🛠️ トラブルシューティング

### ❗ よくある問題と解決方法

#### 🔸 **FFmpegが見つからない**

**エラー:**
```
Error: FFmpeg not found
```

**解決方法:**
1. FFmpegがインストールされているか確認：
   ```bash
   ffmpeg -version
   ```
2. パスが通っていない場合、`.env`でパスを指定：
   ```bash
   FFMPEG_PATH=/usr/local/bin/ffmpeg
   ```

#### 🔸 **Twitchトークンエラー**

**エラー:**
```
Twitch API authentication failed
```

**解決方法:**
1. トークンの有効性を確認：
   ```bash
   npm run token:validate
   ```
2. トークンを再取得：
   ```bash
   npm run token:auto
   ```
3. クライアントIDとシークレットを確認

#### 🔸 **YouTubeストリーム接続エラー**

**エラー:**
```
RTMP connection failed
```

**解決方法:**
1. YouTubeストリームキーを確認
2. RTMP URLが正しいか確認：
   ```bash
   YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2/
   ```
3. ファイアウォール設定を確認

#### 🔸 **配信が検出されない**

**エラー:**
```
No active stream found
```

**解決方法:**
1. Twitchチャンネル名が正しいか確認
2. チャンネルが実際に配信中か確認
3. チェック間隔を短くして再試行：
   ```bash
   CHECK_INTERVAL=10000 npm start
   ```

#### 🔸 **メモリ不足エラー**

**エラー:**
```
JavaScript heap out of memory
```

**解決方法:**
1. Node.jsのメモリ制限を増加：
   ```bash
   node --max-old-space-size=4096 dist/index.js
   ```
2. システムのRAMを確認
3. 他のアプリケーションを終了

#### 🔸 **Google OAuth 403エラー（access_denied）** 🚨

   - **症状**: 「アクセスをブロック: このアプリはGoogleの審査プロセスを完了していません」
   - **原因**: アプリがGoogleの本審査を通っていない（テスト段階）
   
   **🔧 対処法:**
   
   **A) 開発者の場合（推奨）:**
   #### Google Cloud Consoleでテストユーザーを追加
   1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   2. 該当プロジェクトを選択
   3. 「APIとサービス」→「OAuth同意画面」
   4. 下部「テストユーザー」セクションで「+ ADD USERS」
   5. 使用するGmailアドレスを入力して保存
   
   **B) 一時的な解決策:**
    OAuth同意画面で「アプリを公開」を一時的に実行
    ```
    ⚠️ 注意: 本番環境では適切な審査を受けてください
    ```

   **C) その他のチェック項目:**
   - ✅ 正しいGoogleアカウントでログインしているか確認
   - ✅ ブラウザキャッシュをクリア（Ctrl+Shift+Delete）
   - ✅ シークレットモードで試行
   - ✅ リダイレクトURIが正確に設定されているか確認
     ```
     http://localhost:3000/youtube/callback
     ```

### 🔧 詳細診断

#### ログの確認
```bash
# 詳細ログを有効化
LOG_LEVEL=debug npm start

# ログファイルへの出力
npm start > streaming.log 2>&1
```

#### ネットワーク診断
```bash
# Twitch API接続テスト
curl -H "Client-ID: YOUR_CLIENT_ID" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://api.twitch.tv/helix/users

# YouTube RTMP接続テスト
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 \
       -f flv rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY
```

### 📞 サポート情報

問題が解決しない場合：

1. **GitHubで新しいIssueを作成**
   - エラーログを含める
   - 実行環境の情報を含める
   - 再現手順を詳細に記述

2. **必要な情報:**
   - OS とバージョン
   - Node.js バージョン
   - FFmpeg バージョン
   - エラーメッセージの全文
   - 設定ファイル（認証情報は除く）

## 📈 パフォーマンス最適化

### 🚀 システム最適化

#### CPU使用率の最適化
```bash
# FFmpegのプリセット設定
# 高速エンコード（CPU負荷軽減）
FFMPEG_PRESET=ultrafast

# バランス型（デフォルト）
FFMPEG_PRESET=fast

# 高品質（CPU負荷増加）
FFMPEG_PRESET=slow
```

#### メモリ使用量の最適化
```bash
# Node.jsのガベージコレクション調整
node --gc-interval=100 --max-old-space-size=2048 dist/index.js
```

### 🌐 ネットワーク最適化

#### 帯域幅の設定
```bash
# 低帯域幅向け設定
VIDEO_BITRATE=1000k
AUDIO_BITRATE=64k

# 高帯域幅向け設定
VIDEO_BITRATE=4000k
AUDIO_BITRATE=192k
```

#### 遅延の最小化
```bash
# FFmpegの低遅延設定
FFMPEG_OPTIONS="-preset ultrafast -tune zerolatency"
```

### 📊 監視とメトリクス

アプリケーションの状態を監視するためのメトリクス：

```bash
# プロセス監視
ps aux | grep node

# ネットワーク使用量監視
netstat -an | grep :1935

# メモリ使用量監視
free -h
```

## 🤝 コントリビューション

このプロジェクトへの貢献を歓迎します！

### 🔧 開発環境のセットアップ

```bash
# フォークしたリポジトリをクローン
git clone https://github.com/tensandev/twitch-youtube-samestream.git
cd twitch-youtube-samestream

# 依存関係をインストール
npm install

# 開発用ブランチを作成
git checkout -b feature/your-feature-name

# 変更を作成
# ...

# テストを実行
npm test

# コミットとプッシュ
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

### 📝 コントリビューションガイドライン

1. **コードスタイル:** TypeScript と ESLint のルールに従う
2. **テスト:** 新機能には適切なテストを追加
3. **ドキュメント:** 変更点はREADMEも更新
4. **コミット:** 明確で説明的なコミットメッセージを使用

### 🐛 バグレポート

バグを発見した場合：

1. 既存のIssueを確認
2. 再現可能な最小例を作成
3. 環境情報を含める
4. GitHubでIssueを作成

### 💡 機能要望

新機能の要望：

1. GitHubでFeature Requestを作成
2. 用途と利点を説明
3. 可能であれば実装アイデアを提案

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

## 🙏 謝辞

このプロジェクトは以下のオープンソースプロジェクトに依存しています：

- [FFmpeg](https://ffmpeg.org/) - 高性能なマルチメディア処理
- [Node.js](https://nodejs.org/) - サーバーサイドJavaScript実行環境
- [TypeScript](https://typescriptlang.org/) - 型安全なJavaScript
- [Google APIs](https://developers.google.com/) - YouTube統合
- [Twitch API](https://dev.twitch.tv/) - Twitch統合

## 🚀 今後の開発予定

- [ ] **マルチストリーム対応** - 複数のプラットフォームへの同時配信
- [ ] **WebUI** - ブラウザベースの管理インターフェース
- [ ] **配信分析** - 詳細な統計とレポート
- [ ] **自動品質調整** - ネットワーク状況に応じた自動品質調整
- [ ] **クラウド展開** - Docker対応とクラウドプラットフォーム展開ガイド
- [ ] **プラグインシステム** - カスタム機能の追加システム

---

**💬 質問やサポートが必要ですか？**  
GitHubの[Issues](https://github.com/tensandev/twitch-youtube-samestream/issues)でお気軽にお聞かせください！

**⭐ このプロジェクトが役立った場合は、ぜひスターをお願いします！**
