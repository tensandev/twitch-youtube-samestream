#!/usr/bin/env node

import express from 'express';
import chalk from 'chalk';
import { exec } from 'child_process';

interface TwitchTokenResponse {
  access_token: string;
  token_type: string;
  scope: string[];
  expires_in?: number;
}

class TwitchTokenGenerator {
  private app: express.Application;
  private server: any;
  private clientId: string = '';
  private redirectUri: string = 'http://localhost:3000/callback';
  private scopes: string[] = [
    'user:read:email',
    'channel:read:stream_key',
    'channel:read:subscriptions',
    'bits:read',
    'channel:read:hype_train'
  ];

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 静的ファイルの提供
    this.app.use(express.static('public'));

    // ホームページ
    this.app.get('/', (req, res) => {
      res.send(this.getHomePage());
    });

    // 認証開始エンドポイント
    this.app.get('/auth/:clientId', (req, res) => {
      const clientId = req.params.clientId;
      this.clientId = clientId;

      const authUrl = this.buildAuthUrl(clientId);
      console.log(chalk.cyan('🔐 Twitchの認証ページにリダイレクトします...'));
      res.redirect(authUrl);
    });

    // コールバックエンドポイント（Implicit Grant Flow用）
    this.app.get('/callback', (req, res) => {
      res.send(this.getCallbackPage());
    });

    // トークン表示エンドポイント
    this.app.post('/token', express.json(), (req, res) => {
      const { access_token, token_type, scope } = req.body;
      
      if (access_token) {
        console.log(chalk.green('\n🎉 アクセストークンの取得に成功しました！'));
        console.log(chalk.yellow('=' .repeat(60)));
        console.log(chalk.cyan('アクセストークン:'), chalk.white(access_token));
        console.log(chalk.cyan('トークンタイプ:'), chalk.white(token_type || 'bearer'));
        console.log(chalk.cyan('スコープ:'), chalk.white(Array.isArray(scope) ? scope.join(', ') : scope));
        console.log(chalk.yellow('=' .repeat(60)));
        
        console.log(chalk.green('\n📝 .envファイルに以下を追加してください:'));
        console.log(chalk.white(`TWITCH_ACCESS_TOKEN=${access_token}`));
        
        // トークンの有効性をテスト
        this.validateToken(access_token);
        
        res.json({ 
          success: true, 
          message: 'トークンが正常に取得されました！',
          token: access_token 
        });
        
        // 5秒後にサーバーを停止
        setTimeout(() => {
          console.log(chalk.cyan('\n👋 認証完了！サーバーを停止します...'));
          this.stop();
        }, 5000);
      } else {
        console.log(chalk.red('❌ トークンの取得に失敗しました'));
        res.status(400).json({ success: false, message: 'トークンが見つかりません' });
      }
    });
  }

  private buildAuthUrl(clientId: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri,
      response_type: 'token',
      scope: this.scopes.join(' '),
      force_verify: 'true'
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  private getHomePage(): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎮 Twitch Token Generator</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #9146FF;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        .input-group {
            margin: 30px 0;
        }
        label {
            display: block;
            margin-bottom: 10px;
            font-weight: bold;
            color: #333;
        }
        input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="text"]:focus {
            border-color: #9146FF;
            outline: none;
        }
        .btn {
            background: #9146FF;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .btn:hover {
            background: #772ce8;
            transform: translateY(-2px);
        }
        .info {
            background: #f0f8ff;
            border: 1px solid #b3d9ff;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .steps ol {
            padding-left: 20px;
        }
        .steps li {
            margin: 10px 0;
            line-height: 1.6;
        }
        .highlight {
            background: #ffeb3b;
            padding: 2px 6px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮✨ Twitch Token Generator</h1>
        <p>Twitchアクセストークンを簡単に取得できます！</p>
        
        <div class="info">
            <h3>📋 事前準備</h3>
            <div class="steps">
                <ol>
                    <li><a href="https://dev.twitch.tv/console" target="_blank">Twitch Developer Console</a>にアクセス</li>
                    <li>「アプリケーションを登録」をクリック</li>
                    <li>以下の情報を入力：
                        <ul>
                            <li><strong>名前:</strong> 任意の名前</li>
                            <li><strong>OAuth リダイレクト URL:</strong> <span class="highlight">http://localhost:3000/callback</span></li>
                            <li><strong>カテゴリ:</strong> Other</li>
                        </ul>
                    </li>
                    <li><strong>クライアントID</strong>をコピー</li>
                </ol>
            </div>
        </div>

        <div class="input-group">
            <label for="clientId">🔑 Twitch Client ID を入力してください:</label>
            <input type="text" id="clientId" placeholder="例: abc123def456ghi789..." />
        </div>

        <button class="btn" onclick="startAuth()">🚀 認証を開始</button>
        
        <div class="info">
            <h3>🎯 取得されるスコープ</h3>
            <ul>
                <li><strong>user:read:email</strong> - ユーザー情報の読み取り</li>
                <li><strong>channel:read:stream_key</strong> - ストリームキーの読み取り</li>
                <li><strong>channel:read:subscriptions</strong> - サブスクリプション情報</li>
                <li><strong>bits:read</strong> - Bits情報の読み取り</li>
                <li><strong>channel:read:hype_train</strong> - Hype Train情報</li>
            </ul>
        </div>
    </div>

    <script>
        function startAuth() {
            const clientId = document.getElementById('clientId').value.trim();
            if (!clientId) {
                alert('❌ Client IDを入力してください！');
                return;
            }
            
            if (clientId.length < 20) {
                alert('❌ Client IDが短すぎます。正しいClient IDを入力してください。');
                return;
            }
            
            window.location.href = '/auth/' + clientId;
        }
        
        // Enterキーでも認証開始
        document.getElementById('clientId').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                startAuth();
            }
        });
    </script>
</body>
</html>`;
  }

  private getCallbackPage(): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎉 認証完了 - Twitch Token Generator</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            text-align: center;
        }
        h1 {
            color: #4CAF50;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .token-display {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            display: none;
        }
        .success {
            color: #4CAF50;
            font-weight: bold;
        }
        .error {
            color: #f44336;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 認証処理中...</h1>
        <div class="loading"></div>
        <p id="status">トークンを処理しています...</p>
        <div id="tokenDisplay" class="token-display"></div>
    </div>

    <script>
        window.onload = function() {
            // URLフラグメント（#以降）からトークン情報を取得
            const fragment = window.location.hash.substring(1);
            const params = new URLSearchParams(fragment);
            
            const accessToken = params.get('access_token');
            const tokenType = params.get('token_type');
            const scope = params.get('scope');
            
            if (accessToken) {
                // サーバーにトークンを送信
                fetch('/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: accessToken,
                        token_type: tokenType,
                        scope: scope ? scope.split(' ') : []
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('status').innerHTML = '<span class="success">✅ 認証完了！トークンを取得しました</span>';
                        document.getElementById('tokenDisplay').innerHTML = 
                            '<h3>🔑 アクセストークン:</h3>' +
                            '<p>' + accessToken + '</p>' +
                            '<h3>📝 .envファイルに追加:</h3>' +
                            '<p>TWITCH_ACCESS_TOKEN=' + accessToken + '</p>';
                        document.getElementById('tokenDisplay').style.display = 'block';
                        
                        // 5秒後にサーバー停止の案内
                        setTimeout(() => {
                            document.getElementById('status').innerHTML += '<br><br>🚪 5秒後にサーバーが停止します...';
                        }, 1000);
                    } else {
                        document.getElementById('status').innerHTML = '<span class="error">❌ トークンの処理に失敗しました</span>';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('status').innerHTML = '<span class="error">❌ エラーが発生しました</span>';
                });
            } else {
                document.getElementById('status').innerHTML = '<span class="error">❌ トークンが見つかりませんでした</span>';
            }
        };
    </script>
</body>
</html>`;
  }

  private async validateToken(token: string): Promise<void> {
    try {
      console.log(chalk.cyan('🔍 トークンの有効性をテスト中...'));
      
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': this.clientId
        }
      });

      if (response.ok) {
        const data: any = await response.json();
        console.log(chalk.green('✅ トークンは有効です！'));
        if (data.data && data.data[0]) {
          console.log(chalk.cyan('ユーザー名:'), chalk.white(data.data[0].display_name));
          console.log(chalk.cyan('ユーザーID:'), chalk.white(data.data[0].id));
        }
      } else {
        console.log(chalk.yellow('⚠️ トークンのテストに失敗しました'));
        console.log(chalk.red('レスポンス:', response.status, response.statusText));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ トークンのテストでエラーが発生しました:', error));
    }
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
      console.log(chalk.cyan('\n🎮✨ Twitch Token Generator が起動しました！'));
      console.log(chalk.yellow('=' .repeat(60)));
      console.log(chalk.white(`🌐 ブラウザでアクセス: http://localhost:${port}`));
      console.log(chalk.white('🔧 Ctrl+C で停止'));
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
  const tokenGenerator = new TwitchTokenGenerator();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  tokenGenerator.start(port);
}

export default TwitchTokenGenerator;
