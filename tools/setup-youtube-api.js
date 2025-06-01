// YouTube API Setup Script - JavaScript版

const express = require('express');
const chalk = require('chalk');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class YouTubeAPISetup {
  constructor() {
    this.app = express();
    this.server = null;
    this.clientId = '';
    this.clientSecret = '';
    this.redirectUri = 'http://localhost:3000/youtube/callback';
    this.envPath = path.join(process.cwd(), '.env');
    
    this.app.use(express.json());
    this.setupRoutes();
  }

  setupRoutes() {
    // ホームページ
    this.app.get('/', (req, res) => {
      res.send(this.getHomePage());
    });

    // YouTube認証開始
    this.app.post('/youtube/start-auth', (req, res) => {
      const { clientId, clientSecret } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ 
          success: false, 
          message: 'Client IDとClient Secretが必要です' 
        });
      }

      this.clientId = clientId;
      this.clientSecret = clientSecret;

      const authUrl = this.buildAuthUrl();
      console.log(chalk.cyan('🔐 YouTubeの認証ページにリダイレクトします...'));
      
      res.json({ success: true, authUrl });
    });

    // YouTubeコールバック
    this.app.get('/youtube/callback', async (req, res) => {
      const { code, error } = req.query;

      if (error) {
        console.log(chalk.red('❌ YouTube認証エラー:', error));
        return res.send(this.getErrorPage('認証がキャンセルされました'));
      }

      if (!code) {
        console.log(chalk.red('❌ 認証コードが見つかりません'));
        return res.send(this.getErrorPage('認証コードが見つかりません'));
      }

      try {
        const tokenData = await this.exchangeCodeForTokens(code);
        const channelInfo = await this.getChannelInfo(tokenData.access_token);
        
        this.updateEnvFile('YOUTUBE_CLIENT_ID', this.clientId);
        this.updateEnvFile('YOUTUBE_CLIENT_SECRET', this.clientSecret);
        this.updateEnvFile('YOUTUBE_REFRESH_TOKEN', tokenData.refresh_token);
        this.updateEnvFile('YOUTUBE_CHANNEL_ID', channelInfo.id);
        
        console.log(chalk.green('\n🎉 YouTube API設定が完了しました！'));
        console.log(chalk.cyan('チャンネル名:'), chalk.white(channelInfo.title));
        console.log(chalk.cyan('チャンネルID:'), chalk.white(channelInfo.id));
        
        res.send(this.getSuccessPage(tokenData, channelInfo));
        
        setTimeout(() => {
          console.log(chalk.cyan('\n👋 設定完了！サーバーを停止します...'));
          this.stop();
        }, 10000);

      } catch (error) {
        console.error(chalk.red('❌ エラー:'), error);
        res.send(this.getErrorPage('トークンの取得に失敗しました'));
      }
    });
  }

  buildAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri
    });
    return response.data;
  }

  async getChannelInfo(accessToken) {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        part: 'snippet,id',
        mine: 'true'
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        customUrl: channel.snippet.customUrl,
        thumbnails: channel.snippet.thumbnails
      };
    }

    throw new Error('チャンネル情報が見つかりません');
  }

  updateEnvFile(key, value) {
    let envContent = '';
    try {
      envContent = fs.readFileSync(this.envPath, 'utf8');
    } catch (error) {
      envContent = '';
    }
    
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
    }
    
    fs.writeFileSync(this.envPath, envContent);
  }

  getHomePage() {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>🎥 YouTube API Setup</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #FF0000, #CC0000); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 800px; width: 100%; }
        h1 { color: #FF0000; text-align: center; font-size: 2.5em; margin-bottom: 20px; }
        .step { background: #f8f9fa; border-left: 4px solid #FF0000; padding: 20px; margin: 20px 0; border-radius: 0 10px 10px 0; }
        .step h3 { color: #FF0000; margin-top: 0; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; margin: 10px 0; }
        input:focus { border-color: #FF0000; outline: none; }
        .btn { background: #FF0000; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 10px 0; }
        .btn:hover { background: #CC0000; }
        .highlight { background: #ffeb3b; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎥✨ YouTube API セットアップ</h1>
        
        <div class="step">
            <h3>📋 Step 1: Google Cloud Console設定</h3>
            <ol>
                <li><a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>にアクセス</li>
                <li>プロジェクトを作成または選択</li>
                <li>YouTube Data API v3を有効化</li>
                <li>OAuth 2.0 クライアント IDを作成</li>
                <li>リダイレクトURI: <span class="highlight">http://localhost:3000/youtube/callback</span></li>
            </ol>
        </div>

        <div class="step">
            <h3>🔑 Step 2: 認証情報入力</h3>
            <input type="text" id="clientId" placeholder="OAuth 2.0 クライアント ID" required>
            <input type="password" id="clientSecret" placeholder="OAuth 2.0 クライアント シークレット" required>
            <button class="btn" onclick="startAuth()">🚀 YouTube認証を開始</button>
        </div>
    </div>

    <script>
        async function startAuth() {
            const clientId = document.getElementById('clientId').value.trim();
            const clientSecret = document.getElementById('clientSecret').value.trim();
            
            if (!clientId || !clientSecret) {
                alert('❌ 認証情報を入力してください！');
                return;
            }
            
            try {
                const response = await fetch('/youtube/start-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, clientSecret })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.open(data.authUrl, '_blank');
                } else {
                    alert('❌ ' + data.message);
                }
            } catch (error) {
                alert('❌ エラーが発生しました');
            }
        }
    </script>
</body>
</html>`;
  }

  getSuccessPage(tokenData, channelInfo) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>🎉 設定完了</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #4CAF50, #45a049); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 600px; text-align: center; }
        h1 { color: #4CAF50; font-size: 2.5em; }
        .channel-info { display: flex; align-items: center; gap: 15px; margin: 20px 0; justify-content: center; }
        .channel-avatar { width: 60px; height: 60px; border-radius: 50%; }
        .info-box { background: #f5f5f5; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: left; }
        .success { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 YouTube API設定完了!</h1>
        
        <div class="channel-info">
            <img src="${channelInfo.thumbnails.medium.url}" alt="Avatar" class="channel-avatar">
            <div>
                <h3>${channelInfo.title}</h3>
                <p>チャンネルID: ${channelInfo.id}</p>
            </div>
        </div>
        
        <div class="info-box">
            <h3>✅ 設定完了項目</h3>
            <ul>
                <li>YouTube Client ID: 設定済み</li>
                <li>YouTube Client Secret: 設定済み</li>
                <li>YouTube Refresh Token: 設定済み</li>
                <li>YouTube Channel ID: 設定済み</li>
            </ul>
        </div>
        
        <p class="success">🚪 10秒後にサーバーが自動停止します...</p>
    </div>
</body>
</html>`;
  }

  getErrorPage(errorMessage) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>❌ エラー</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #f44336, #d32f2f); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
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

  openBrowser(url) {
    const command = process.platform === 'win32' ? `start ""  "${url}"` : 
                   process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    
    exec(command, (error) => {
      if (error) {
        console.log(chalk.yellow('⚠️ ブラウザの自動起動に失敗しました。手動でアクセスしてください。'));
        console.log(chalk.cyan(`🌐 手動でアクセス: ${url}`));
      }
    });
  }

  start(port = 3000) {
    this.server = this.app.listen(port, () => {
      console.log(chalk.red('\n🎥✨ YouTube API Setup が起動しました！'));
      console.log(chalk.yellow('=' .repeat(60)));
      console.log(chalk.white(`🌐 ブラウザでアクセス: http://localhost:${port}`));
      console.log(chalk.white('🔧 Ctrl+C で停止'));
      console.log(chalk.yellow('=' .repeat(60)));
      
      this.openBrowser(`http://localhost:${port}`);
    });

    process.on('SIGINT', () => {
      console.log(chalk.cyan('\n👋 サーバーを停止しています...'));
      this.stop();
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log(chalk.green('✅ サーバーが正常に停止されました'));
        process.exit(0);
      });
    }
  }
}

const youtubeSetup = new YouTubeAPISetup();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
youtubeSetup.start(port);