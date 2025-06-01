#!/usr/bin/env node

import express, { Request, Response, Application } from 'express';
import chalk from 'chalk';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

interface YouTubeOAuthResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

class YouTubeAPISetup {
  private app: Application;
  private server: any;
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = 'http://localhost:3000/youtube/callback';
  private envPath: string = path.join(process.cwd(), '.env');
  private scopes: string[] = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ];

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // ホームページ
    this.app.get('/', (req: Request, res: Response) => {
      res.send(this.getHomePage());
    });

    // YouTube認証開始
    this.app.post(
      '/youtube/start-auth',
      (
        req: Request,
        res: Response
      ) => {
        const { clientId, clientSecret, apiKey } = req.body as { 
          clientId: string; 
          clientSecret: string; 
          apiKey?: string 
        };
        
        if (!clientId || !clientSecret) {
          res.status(400).json({ 
            success: false, 
            message: 'Client IDとClient Secretが必要です' 
          });
          return;
        }

        this.clientId = clientId;
        this.clientSecret = clientSecret;

        // API Keyも一緒に保存
        if (apiKey) {
          this.updateEnvFile('YOUTUBE_API_KEY', apiKey);
        }

        const authUrl = this.buildYouTubeAuthUrl();
        console.log(chalk.cyan('🔐 YouTubeの認証ページにリダイレクトします...'));
        
        res.json({ success: true, authUrl });
      }
    );

    // YouTubeコールバック
    this.app.get(
      '/youtube/callback',
      async (
        req: Request,
        res: Response
      ) => {
        const { code, error } = req.query as { code?: string; error?: string };

        if (error) {
          console.log(chalk.red('❌ YouTube認証エラー:', error));
          res.send(this.getErrorPage('認証がキャンセルされました'));
          return;
        }

        if (!code) {
          console.log(chalk.red('❌ 認証コードが見つかりません'));
          res.send(this.getErrorPage('認証コードが見つかりません'));
          return;
        }

        try {
          // 認証コードをトークンに交換
          const tokenData = await this.exchangeCodeForTokens(code as string);
          
          // チャンネル情報を取得
          const channelInfo = await this.getChannelInfo(tokenData.access_token);
          
          // .envファイルを更新
          await this.updateAllYouTubeSettings(tokenData, channelInfo);
          
          console.log(chalk.green('\n🎉 YouTube API設定が完了しました！'));
          res.send(this.getSuccessPage(tokenData, channelInfo));
          
          // 10秒後にサーバーを停止
          setTimeout(() => {
            console.log(chalk.cyan('\n👋 設定完了！サーバーを停止します...'));
            this.stop();
          }, 10000);

        } catch (error) {
          console.error(chalk.red('❌ トークン交換エラー:'), error);
          res.send(this.getErrorPage('トークンの取得に失敗しました'));
        }
      }
    );

    // 設定状況確認API
    this.app.get('/api/status', (req: Request, res: Response) => {
      const envContent = this.readEnvFile();
      const status = {
        youtubeApiKey: !!this.getEnvValue('YOUTUBE_API_KEY', envContent),
        youtubeClientId: !!this.getEnvValue('YOUTUBE_CLIENT_ID', envContent),
        youtubeClientSecret: !!this.getEnvValue('YOUTUBE_CLIENT_SECRET', envContent),
        youtubeRefreshToken: !!this.getEnvValue('YOUTUBE_REFRESH_TOKEN', envContent),
        youtubeChannelId: !!this.getEnvValue('YOUTUBE_CHANNEL_ID', envContent),
        youtubeStreamKey: !!this.getEnvValue('YOUTUBE_STREAM_KEY', envContent),
      };
      res.json(status);
    });

    // Stream Key設定API
    this.app.post(
      '/api/set-stream-key',
      (
        req: Request,
        res: Response
      ) => {
        const { streamKey } = req.body as { streamKey: string };
        if (!streamKey) {
          res.status(400).json({ success: false, message: 'Stream Keyが必要です' });
          return;
        }

        this.updateEnvFile('YOUTUBE_STREAM_KEY', streamKey);
        console.log(chalk.green('✅ YouTube Stream Keyが設定されました'));
        res.json({ success: true, message: 'Stream Keyが設定されました' });
      }
    );
  }

  private buildYouTubeAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async exchangeCodeForTokens(code: string): Promise<YouTubeOAuthResponse> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const params = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    };

    const response = await axios.post(tokenUrl, params);
    return response.data;
  }

  private async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    const channelUrl = 'https://www.googleapis.com/youtube/v3/channels';
    
    const params = {
      part: 'snippet,id',
      mine: 'true'
    };

    const response = await axios.get(channelUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        customUrl: channel.snippet.customUrl,
        description: channel.snippet.description,
        publishedAt: channel.snippet.publishedAt,
        thumbnails: channel.snippet.thumbnails
      };
    }

    throw new Error('チャンネル情報が見つかりません');
  }

  private readEnvFile(): string {
    try {
      return fs.readFileSync(this.envPath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  private getEnvValue(key: string, envContent: string): string {
    const match = envContent.match(new RegExp(`^${key}=(.*)`, 'm'));
    return match ? match[1] : '';
  }

  private updateEnvFile(key: string, value: string): void {
    let envContent = this.readEnvFile();
    
    const regex = new RegExp(`^${key}=.*`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      // 既存の行を更新
      envContent = envContent.replace(regex, newLine);
    } else {
      // 新しい行を追加
      envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
    }
    
    fs.writeFileSync(this.envPath, envContent);
  }

  private async updateAllYouTubeSettings(tokenData: YouTubeOAuthResponse, channelInfo: YouTubeChannelInfo): Promise<void> {
    // OAuth設定を更新
    this.updateEnvFile('YOUTUBE_CLIENT_ID', this.clientId);
    this.updateEnvFile('YOUTUBE_CLIENT_SECRET', this.clientSecret);
    this.updateEnvFile('YOUTUBE_REFRESH_TOKEN', tokenData.refresh_token);
    this.updateEnvFile('YOUTUBE_CHANNEL_ID', channelInfo.id);
    
    console.log(chalk.green('✅ YouTube OAuth設定を更新しました'));
    console.log(chalk.cyan('チャンネル名:'), chalk.white(channelInfo.title));
    console.log(chalk.cyan('チャンネルID:'), chalk.white(channelInfo.id));
    console.log(chalk.cyan('リフレッシュトークン:'), chalk.white(tokenData.refresh_token.substring(0, 20) + '...'));
  }

  private getHomePage(): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>🎥 YouTube API Setup</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #FF0000, #CC0000); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 800px; width: 100%; }
        h1 { color: #FF0000; text-align: center; font-size: 2.5em; margin-bottom: 20px; }
        .step { background: #f8f9fa; border-left: 4px solid #FF0000; padding: 20px; margin: 20px 0; border-radius: 0 10px 10px 0; }
        .step h3 { color: #FF0000; margin-top: 0; }
        .input-group { margin: 15px 0; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        input:focus { border-color: #FF0000; outline: none; }
        .btn { background: #FF0000; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; margin: 5px; }
        .btn:hover { background: #CC0000; transform: translateY(-1px); }
        .highlight { background: #ffeb3b; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎥✨ YouTube API セットアップ</h1>
        
        <div class="step">
            <h3>📋 Step 1: Google Cloud Consoleでの設定</h3>
            <ol>
                <li><a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>にアクセス</li>
                <li>新しいプロジェクトを作成または既存のプロジェクトを選択</li>
                <li>「APIとサービス」→「ライブラリ」で<strong>YouTube Data API v3</strong>を有効化</li>
                <li>「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択</li>
                <li>アプリケーションの種類: <span class="highlight">ウェブアプリケーション</span></li>
                <li>承認済みのリダイレクト URI: <span class="highlight">http://localhost:3000/youtube/callback</span></li>
            </ol>
        </div>

        <div class="step">
            <h3>🔑 Step 2: 認証情報の入力</h3>
            <div class="input-group">
                <label for="clientId">OAuth 2.0 クライアント ID:</label>
                <input type="text" id="clientId" placeholder="123456789-abcdefg.apps.googleusercontent.com" required>
            </div>
            <div class="input-group">
                <label for="clientSecret">OAuth 2.0 クライアント シークレット:</label>
                <input type="password" id="clientSecret" placeholder="GOCSPX-..." required>
            </div>
            <button class="btn" onclick="startAuth()">🚀 YouTube認証を開始</button>
        </div>
    </div>

    <script>
        async function startAuth() {
            const clientId = document.getElementById('clientId').value.trim();
            const clientSecret = document.getElementById('clientSecret').value.trim();
            
            if (!clientId || !clientSecret) {
                alert('❌ クライアントIDとクライアントシークレットを入力してください！');
                return;
            }
            
            try {
                const response = await fetch('/youtube/start-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, clientSecret })
                });
          return;
                
                const data = await response.json();
                
                if (data.success) {
                    window.open(data.authUrl, '_blank');
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                alert('❌ エラーが発生しました: ' + error.message);
            }
        }
    </script>
</body>
</html>`;
  }

  private getSuccessPage(tokenData: YouTubeOAuthResponse, channelInfo: YouTubeChannelInfo): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>🎉 YouTube API設定完了</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #4CAF50, #45a049); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 600px; text-align: center; }
        h1 { color: #4CAF50; font-size: 2.5em; margin-bottom: 20px; }
        .channel-info { display: flex; align-items: center; gap: 15px; margin: 15px 0; }
        .channel-avatar { width: 60px; height: 60px; border-radius: 50%; }
        .info-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: left; }
        .success { color: #4CAF50; font-weight: bold; }
        .code { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 YouTube API設定完了!</h1>
        
        <div class="channel-info">
            <img src="${channelInfo.thumbnails.medium.url}" alt="Channel Avatar" class="channel-avatar">
            <div>
                <h3>${channelInfo.title}</h3>
                <p>チャンネルID: ${channelInfo.id}</p>
            </div>
        </div>
        
        <div class="info-box">
            <h3>✅ 設定完了項目</h3>
            <ul>
                <li><strong>YouTube Client ID:</strong> 設定済み</li>
                <li><strong>YouTube Client Secret:</strong> 設定済み</li>
                <li><strong>YouTube Refresh Token:</strong> 設定済み</li>
                <li><strong>YouTube Channel ID:</strong> ${channelInfo.id}</li>
            </ul>
        </div>
        
        <div class="info-box">
            <h3>📝 次のステップ</h3>
            <p><a href="https://studio.youtube.com/" target="_blank">YouTube Studio</a>からストリームキーを取得して.envに追加してください:</p>
            <div class="code">YOUTUBE_STREAM_KEY=your_stream_key_here</div>
        </div>
        
        <p class="success">🚪 10秒後にサーバーが自動停止します...</p>
    </div>
</body>
</html>`;
  }

  private getErrorPage(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>❌ エラー</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: linear-gradient(135deg, #f44336, #d32f2f); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 600px; text-align: center; }
        h1 { color: #f44336; font-size: 2.5em; }
        .error { color: #f44336; font-weight: bold; font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ エラーが発生しました</h1>
        <p class="error">${errorMessage}</p>
        <p>ブラウザを閉じて、再度お試しください。</p>
    </div>
</body>
</html>`;
  }

  private openBrowser(url: string): void {
    const command = process.platform === 'win32' ? `start ""  "${url}"` : 
                   process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    
    exec(command, (error) => {
      if (error) {
        console.log(chalk.yellow('⚠️ ブラウザの自動起動に失敗しました。手動でアクセスしてください。'));
        console.log(chalk.cyan(`🌐 手動でアクセス: ${url}`));
      }
    });
  }

  public start(port: number = 3000): void {
    this.server = this.app.listen(port, () => {
      console.log(chalk.red('\n🎥✨ YouTube API Setup が起動しました！'));
      console.log(chalk.yellow('=' .repeat(60)));
      console.log(chalk.white(`🌐 ブラウザでアクセス: http://localhost:${port}`));
      console.log(chalk.white('🔧 Ctrl+C で停止'));
      console.log(chalk.yellow('=' .repeat(60)));
      console.log(chalk.white('\n📋 セットアップ手順:'));
      console.log(chalk.white('1. Google Cloud Console でプロジェクト作成'));
      console.log(chalk.white('2. YouTube Data API v3 を有効化'));
      console.log(chalk.white('3. OAuth 2.0 認証情報を作成'));
      console.log(chalk.white('4. ブラウザで認証情報を入力'));
      console.log(chalk.white('5. 自動で .env ファイルが更新されます！'));
      console.log(chalk.yellow('=' .repeat(60)));
      
      // ブラウザを自動で開く
      this.openBrowser(`http://localhost:${port}`);
    });

    // Ctrl+C での終了をハンドル
    process.on('SIGINT', () => {
      console.log(chalk.cyan('\n👋 サーバーを停止しています...'));
      this.stop();
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.log(chalk.green('✅ サーバーが正常に停止されました'));
        process.exit(0);
      });
    }
  }
}

// メイン実行
if (require.main === module) {
  const youtubeSetup = new YouTubeAPISetup();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  youtubeSetup.start(port);
}

export default YouTubeAPISetup;
