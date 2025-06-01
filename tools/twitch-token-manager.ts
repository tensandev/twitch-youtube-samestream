#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

// 環境変数を読み込み
dotenv.config();

interface TwitchTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string[];
  refresh_token?: string;
}

interface TokenData {
  access_token: string;
  token_type: string;
  expires_at: number;
  scope: string[];
  refresh_token?: string;
}

export class TwitchTokenManager {
  private clientId: string;
  private clientSecret: string;
  private envPath: string;
  private tokenCachePath: string;

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId || process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.TWITCH_CLIENT_SECRET || '';
    this.envPath = path.join(process.cwd(), '.env');
    this.tokenCachePath = path.join(process.cwd(), '.twitch-token-cache.json');
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('❌ TWITCH_CLIENT_ID と TWITCH_CLIENT_SECRET が必要です');
    }
  }

  /**
   * Client Credentials Flow を使用してアプリ専用トークンを取得
   * ユーザー認証が不要で、基本的なAPI呼び出しが可能
   */
  public async getAppAccessToken(): Promise<string> {
    try {
      console.log(chalk.cyan('🔄 アプリ専用トークンを取得中...'));
      
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData: TwitchTokenResponse = response.data;
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      
      const cacheData: TokenData = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_at: expiresAt,
        scope: tokenData.scope || ['app']
      };

      // トークンをキャッシュに保存
      await this.saveTokenCache(cacheData);
      
      // .envファイルを更新
      await this.updateEnvFile('TWITCH_ACCESS_TOKEN', tokenData.access_token);
      
      console.log(chalk.green('✅ アプリ専用トークンを取得しました'));
      console.log(chalk.yellow(`⏰ 有効期限: ${new Date(expiresAt).toLocaleString('ja-JP')}`));
      
      return tokenData.access_token;
    } catch (error) {
      console.error(chalk.red('❌ アプリ専用トークンの取得に失敗:'), error);
      throw error;
    }
  }

  /**
   * 既存のトークンの有効性をチェック
   */
  public async validateToken(token?: string): Promise<boolean> {
    try {
      const accessToken = token || await this.getCurrentToken();
      if (!accessToken) return false;

      const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 200) {
        const data = response.data;
        console.log(chalk.green('✅ トークンは有効です'));
        console.log(chalk.cyan(`🕒 残り有効時間: ${Math.floor(data.expires_in / 3600)}時間`));
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(chalk.yellow('⚠️ トークンが無効または期限切れです'));
      return false;
    }
  }

  /**
   * トークンの自動更新
   * 1. キャッシュから既存トークンを確認
   * 2. 期限切れの場合は新しいトークンを取得
   * 3. .envファイルを自動更新
   */
  public async ensureValidToken(): Promise<string> {
    try {
      // キャッシュから既存トークンを読み込み
      const cachedToken = await this.getTokenFromCache();
      
      if (cachedToken && this.isTokenValid(cachedToken)) {
        console.log(chalk.green('✅ 有効なトークンがキャッシュに存在します'));
        return cachedToken.access_token;
      }

      // 期限切れまたはトークンが存在しない場合は新しく取得
      console.log(chalk.yellow('🔄 新しいトークンを取得します...'));
      return await this.getAppAccessToken();
      
    } catch (error) {
      console.error(chalk.red('❌ トークンの確保に失敗:'), error);
      throw error;
    }
  }

  /**
   * 現在の.envファイルからトークンを取得
   */
  private async getCurrentToken(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.envPath)) return null;
      
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const match = envContent.match(/TWITCH_ACCESS_TOKEN=(.+)/);
      return match ? match[1].trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * トークンキャッシュから読み込み
   */
  private async getTokenFromCache(): Promise<TokenData | null> {
    try {
      if (!fs.existsSync(this.tokenCachePath)) return null;
      
      const cacheContent = fs.readFileSync(this.tokenCachePath, 'utf8');
      return JSON.parse(cacheContent);
    } catch (error) {
      console.log(chalk.yellow('⚠️ トークンキャッシュの読み込みに失敗'));
      return null;
    }
  }

  /**
   * トークンキャッシュに保存
   */
  private async saveTokenCache(tokenData: TokenData): Promise<void> {
    try {
      fs.writeFileSync(this.tokenCachePath, JSON.stringify(tokenData, null, 2));
      console.log(chalk.green('💾 トークンをキャッシュに保存しました'));
    } catch (error) {
      console.error(chalk.red('❌ トークンキャッシュの保存に失敗:'), error);
    }
  }

  /**
   * トークンの有効性をチェック（期限確認）
   */
  private isTokenValid(tokenData: TokenData): boolean {
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5分のバッファ
    return tokenData.expires_at > (now + buffer);
  }

  /**
   * .envファイルを更新
   */
  private async updateEnvFile(key: string, value: string): Promise<void> {
    try {
      let envContent = '';
      
      // 既存の.envファイルを読み込み
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // 既存のキーがある場合は更新、ない場合は追加
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent = envContent.trim() + '\n' + newLine + '\n';
      }

      // .envファイルに書き込み
      fs.writeFileSync(this.envPath, envContent);
      console.log(chalk.green(`📝 .envファイルを更新しました: ${key}`));
      
    } catch (error) {
      console.error(chalk.red('❌ .envファイルの更新に失敗:'), error);
      throw error;
    }
  }

  /**
   * トークンの詳細情報を表示
   */
  public async showTokenInfo(): Promise<void> {
    try {
      const cachedToken = await this.getTokenFromCache();
      const currentToken = await this.getCurrentToken();

      console.log(chalk.cyan('\n🔍 トークン情報'));
      console.log(chalk.yellow('=' .repeat(50)));
      
      if (currentToken) {
        console.log(chalk.green('📄 .envファイルのトークン:'));
        console.log(chalk.white(`   ${currentToken.substring(0, 20)}...`));
        
        const isValid = await this.validateToken(currentToken);
        console.log(chalk.white(`   有効性: ${isValid ? '✅ 有効' : '❌ 無効'}`));
      } else {
        console.log(chalk.red('❌ .envファイルにトークンがありません'));
      }

      if (cachedToken) {
        console.log(chalk.green('\n💾 キャッシュのトークン:'));
        console.log(chalk.white(`   アクセストークン: ${cachedToken.access_token.substring(0, 20)}...`));
        console.log(chalk.white(`   有効期限: ${new Date(cachedToken.expires_at).toLocaleString('ja-JP')}`));
        console.log(chalk.white(`   スコープ: ${cachedToken.scope.join(', ')}`));
        console.log(chalk.white(`   状態: ${this.isTokenValid(cachedToken) ? '✅ 有効' : '❌ 期限切れ'}`));
      } else {
        console.log(chalk.red('\n❌ キャッシュにトークンがありません'));
      }

      console.log(chalk.yellow('=' .repeat(50)));
    } catch (error) {
      console.error(chalk.red('❌ トークン情報の表示に失敗:'), error);
    }
  }

  /**
   * トークンキャッシュをクリア
   */
  public async clearCache(): Promise<void> {
    try {
      if (fs.existsSync(this.tokenCachePath)) {
        fs.unlinkSync(this.tokenCachePath);
        console.log(chalk.green('🗑️ トークンキャッシュをクリアしました'));
      } else {
        console.log(chalk.yellow('⚠️ キャッシュファイルが存在しません'));
      }
    } catch (error) {
      console.error(chalk.red('❌ キャッシュのクリアに失敗:'), error);
    }
  }
}

// CLI実行用
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    const manager = new TwitchTokenManager();

    switch (command) {
      case 'get':
        await manager.getAppAccessToken();
        break;
      
      case 'validate':
        const isValid = await manager.validateToken();
        console.log(`トークンの状態: ${isValid ? '有効' : '無効'}`);
        break;
      
      case 'ensure':
        const token = await manager.ensureValidToken();
        console.log(chalk.green(`✅ 有効なトークンを確保: ${token.substring(0, 20)}...`));
        break;
      
      case 'info':
        await manager.showTokenInfo();
        break;
      
      case 'clear':
        await manager.clearCache();
        break;
      
      default:
        console.log(chalk.cyan('🎮✨ Twitch Token Manager'));
        console.log(chalk.yellow('=' .repeat(40)));
        console.log(chalk.white('使用方法:'));
        console.log(chalk.white('  npm run token:get      - 新しいトークンを取得'));
        console.log(chalk.white('  npm run token:validate - 現在のトークンを検証'));
        console.log(chalk.white('  npm run token:ensure   - 有効なトークンを確保'));
        console.log(chalk.white('  npm run token:info     - トークン情報を表示'));
        console.log(chalk.white('  npm run token:clear    - キャッシュをクリア'));
        console.log(chalk.yellow('=' .repeat(40)));
        break;
    }
  } catch (error) {
    console.error(chalk.red('❌ エラーが発生しました:'), error);
    process.exit(1);
  }
}

// メイン実行
if (require.main === module) {
  main();
}

export default TwitchTokenManager;
