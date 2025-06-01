import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

// 動的インポートでtwitch-streamlink-extractorを読み込み
const twitchStreamlinkExtractor = require('twitch-streamlink-extractor');

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
}

export interface TwitchStreamQuality {
  quality: string;
  link: string;
}

export class TwitchService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private deviceId: string;
  private userAgent: string;

  constructor(clientId: string, clientSecret: string, accessToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = accessToken;
    
    // ランダムなdeviceIdを生成
    this.deviceId = this.generateDeviceId();
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    logger.info('🎮 マルチ方式TwitchService初期化完了', '✨');
  }

  /**
   * デバイスIDを生成
   */
  private generateDeviceId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * アクセストークンの有効性を確認
   */
  public async validateToken(): Promise<boolean> {
    try {
      logger.debug('Twitchトークンの有効性をチェック中...', '🔑');
      
      // 公式APIで簡単な検証
      const axios = require('axios');
      const response = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Client-Id': this.clientId,
        },
        timeout: 10000
      });

      logger.debug('API Request: GET /users', '📡');
      logger.debug(`API Response: ${response.status} /users`, '📨');

      if (response.status === 200) {
        logger.success('🎉 Twitchトークンは有効です');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Twitchトークンが無効です', error as Error, '🔑❌');
      return false;
    }
  }
  /**
   * 指定されたチャンネルの配信状況を取得
   */
  public async getStreamStatus(channelName: string): Promise<TwitchStream | null> {
    try {
      logger.twitch(`配信状況をチェック中: ${channelName}`);
      
      const response = await axios.get('https://api.twitch.tv/helix/streams', {
        params: { user_login: channelName },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Client-Id': this.clientId,
        },
        timeout: 10000
      });

      logger.debug('API Request: GET /streams', '📡');
      logger.debug(`API Response: ${response.status} /streams`, '📨');

      if (!response.data.data || response.data.data.length === 0) {
        logger.debug(`${channelName} は現在オフラインです`, '📴');
        return null;
      }

      const stream = response.data.data[0];
      logger.streaming(`🔴 ${channelName} が配信中！ - ${stream.title}`);
      logger.stats({
        'タイトル': stream.title,
        'ゲーム': stream.game_name,
        '視聴者数': stream.viewer_count,
        '開始時刻': new Date(stream.started_at).toLocaleString('ja-JP'),
        '言語': stream.language,
      });

      return stream;
    } catch (error) {
      logger.error(`配信状況の取得に失敗: ${channelName}`, error as Error);
      return null;
    }
  }  /**
   * 配信のプレイリストURL（M3U8）を取得する
   * Helix APIを使用してHTTP 405エラーを修正
   */
  public async getStreamPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.twitch(`プレイリストURLを取得中: ${channelName}`);

      // まず配信状況を確認
      const streamInfo = await this.getStreamStatus(channelName);
      if (!streamInfo) {
        logger.warn(`${channelName} は現在配信していません`);
        return null;
      }

      logger.debug('配信が確認できました。外部ツールでプレイリストURLを取得中...');
      
      // 直接フォールバック方式を使用（Helix APIではプレイリストURLは提供されない）
      return this.getFallbackMethods(channelName);    } catch (error: any) {
      this.analyzeHttpError(error, `プレイリストURL取得 - ${channelName}`);
      
      // 最終フォールバック
      return this.getFallbackMethods(channelName);
    }
  }
  /**
   * フォールバック方式: 外部ツールを使用
   */
  private async getFallbackMethods(channelName: string): Promise<string | null> {
    try {
      logger.warn('外部ツールフォールバック方式を開始...', '🔄');

      // 方法1: twitch-streamlink-extractor (NPMライブラリ) - 最も信頼性が高い
      try {
        logger.debug('twitch-streamlink-extractorを試行中...', '📦');
        const streamData: TwitchStreamQuality[] = await twitchStreamlinkExtractor.extract(
          channelName,
          this.clientId,
          this.deviceId,
          this.accessToken !== 'undefined' ? this.accessToken : undefined,
          this.userAgent
        );

        if (streamData && streamData.length > 0) {
          const bestQuality = streamData[0];
          logger.success(`twitch-streamlink-extractorでプレイリストURLを取得: ${channelName}`);
          logger.info(`品質: ${bestQuality.quality}`, '📊');
          return bestQuality.link;
        }
      } catch (extractorError: any) {
        logger.debug(`twitch-streamlink-extractor失敗: ${extractorError.message}`, '📦❌');
      }

      // 方法2: Streamlink子プロセス
      try {
        logger.debug('Streamlink子プロセスを試行中...', '⚙️');
        const streamlinkUrl = await this.getStreamUrlViaStreamlink(channelName);
        if (streamlinkUrl) {
          return streamlinkUrl;
        }
      } catch (streamlinkError: any) {
        logger.debug(`Streamlink失敗: ${streamlinkError.message}`, '⚙️❌');
      }

      // 方法3: yt-dlp子プロセス
      try {
        logger.debug('yt-dlp子プロセスを試行中...', '🔧');
        const ytdlpUrl = await this.getStreamUrlViaYtDlp(channelName);
        if (ytdlpUrl) {
          return ytdlpUrl;
        }
      } catch (ytdlpError: any) {
        logger.debug(`yt-dlp失敗: ${ytdlpError.message}`, '🔧❌');
      }

      // 最終フォールバック
      logger.warn('最終フォールバック方式を試行中...', '🔄');
      return this.getFallbackPlaylistUrl(channelName);

    } catch (error) {
      logger.error(`すべてのフォールバック方式が失敗: ${channelName}`, error as Error);
      return null;
    }
  }

  /**
   * Streamlink子プロセスを使用してストリームURLを取得
   */
  private async getStreamUrlViaStreamlink(channelName: string): Promise<string | null> {
    return new Promise((resolve) => {
      logger.debug('Streamlink子プロセスを起動中...', '⚙️');
      
      const { spawn } = require('child_process');
      const twitchUrl = `https://www.twitch.tv/${channelName}`;
      
      // Streamlinkコマンドを実行（URLのみを取得、実際の再生はしない）
      const streamlink = spawn('streamlink', [
        twitchUrl,
        'best',
        '--stream-url',  // ストリームURLのみを出力
        '--twitch-disable-reruns',  // 再放送を無効化
        '--quiet'  // 詳細ログを抑制
      ]);

      let outputData = '';
      let errorData = '';

      streamlink.stdout.on('data', (data: Buffer) => {
        outputData += data.toString();
      });

      streamlink.stderr.on('data', (data: Buffer) => {
        errorData += data.toString();
      });

      streamlink.on('close', (code: number) => {
        if (code === 0 && outputData.trim()) {
          const streamUrl = outputData.trim();
          logger.success('🎯 StreamlinkでプレイリストURL取得成功');
          logger.debug(`URL: ${streamUrl.substring(0, 100)}...`);
          resolve(streamUrl);
        } else {
          logger.debug(`Streamlink終了コード: ${code}`);
          if (errorData.trim()) {
            logger.debug(`Streamlinkエラー: ${errorData.trim()}`);
          }
          resolve(null);
        }
      });

      streamlink.on('error', (error: Error) => {
        logger.debug(`Streamlink実行エラー: ${error.message}`);
        resolve(null);
      });

      // タイムアウト設定（20秒）
      setTimeout(() => {
        streamlink.kill();
        logger.debug('Streamlinkタイムアウト', '⏰');
        resolve(null);
      }, 20000);
    });
  }

  /**
   * yt-dlp子プロセスを使用してストリームURLを取得（フォールバック）
   */
  private async getStreamUrlViaYtDlp(channelName: string): Promise<string | null> {
    return new Promise((resolve) => {
      logger.debug('yt-dlp子プロセスを起動中...', '🔧');
      
      const { spawn } = require('child_process');
      const twitchUrl = `https://www.twitch.tv/${channelName}`;
      
      // yt-dlpコマンドを実行
      const ytdlp = spawn('yt-dlp', [
        '--get-url',  // URLのみを取得
        '--format', 'best',
        twitchUrl
      ]);

      let outputData = '';
      let errorData = '';

      ytdlp.stdout.on('data', (data: Buffer) => {
        outputData += data.toString();
      });

      ytdlp.stderr.on('data', (data: Buffer) => {
        errorData += data.toString();
      });

      ytdlp.on('close', (code: number) => {
        if (code === 0 && outputData.trim()) {
          const streamUrl = outputData.trim();
          logger.success('🎯 yt-dlpでプレイリストURL取得成功');
          logger.debug(`URL: ${streamUrl.substring(0, 100)}...`);
          resolve(streamUrl);
        } else {
          logger.debug(`yt-dlp終了コード: ${code}`);
          if (errorData.trim()) {
            logger.debug(`yt-dlpエラー: ${errorData.trim()}`);
          }
          resolve(null);
        }
      });

      ytdlp.on('error', (error: Error) => {
        logger.debug(`yt-dlp実行エラー: ${error.message}`);
        resolve(null);
      });

      // タイムアウト設定（20秒）
      setTimeout(() => {
        ytdlp.kill();
        logger.debug('yt-dlpタイムアウト', '⏰');
        resolve(null);
      }, 20000);
    });
  }
  /**
   * フォールバック: 簡易的なプレイリストURL生成
   * 注意: このメソッドは最後の手段として使用され、成功率は限定的です
   */
  private async getFallbackPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.debug('フォールバック: 簡易URL構築中...', '🔄');
      
      // 複数のフォールバックURLを試す
      const fallbackUrls = [
        // 基本的なURL
        `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?allow_source=true&allow_audio_only=true`,
        
        // 追加パラメータ付きURL
        `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?player=twitchweb&token={%22authorization%22:{%22forbidden%22:false,%22reason%22:%22%22},%22chansub%22:{%22restricted_bitrates%22:[],%22view_until%22:1924905600},%22device_id%22:%22${this.deviceId}%22,%22expires%22:1924905600,%22https_required%22:true,%22privileged%22:false,%22user_id%22:null,%22version%22:2}&sig=0&allow_source=true&allow_audio_only=true&allow_spectre=false&p=${Math.floor(Math.random() * 1000000)}`,
        
        // さらなるフォールバック
        `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?p=${Math.floor(Math.random() * 1000000)}`
      ];

      const axios = require('axios');
      
      for (const fallbackUrl of fallbackUrls) {
        try {
          logger.debug(`フォールバックURLをテスト中: ${fallbackUrl.substring(0, 80)}...`);
          
          const testResponse = await axios.head(fallbackUrl, { 
            timeout: 8000,
            headers: {
              'User-Agent': this.userAgent,
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Origin': 'https://www.twitch.tv',
              'Referer': `https://www.twitch.tv/${channelName}`
            },
            validateStatus: (status: number) => status < 500 // 4xxエラーも許可（場合によっては有効）
          });
          
          if (testResponse.status === 200) {
            logger.info('フォールバックURL取得成功', '🔄✅');
            logger.debug(`成功したURL: ${fallbackUrl.substring(0, 80)}...`);
            return fallbackUrl;
          } else if (testResponse.status === 403 || testResponse.status === 404) {
            logger.debug(`フォールバックURL ${testResponse.status}: ${fallbackUrl.substring(0, 50)}...`);
            continue;
          }
        } catch (testError: any) {
          logger.debug(`フォールバックURLテスト失敗: ${testError.message?.substring(0, 100)}`);
          continue;
        }
      }

      logger.warn('すべてのフォールバックURLが失敗しました', '🔄❌');
      return null;
      
    } catch (error) {
      logger.error('フォールバック方式も失敗', error as Error);
      return null;
    }
  }

  /**
   * 配信の品質オプションを取得
   */
  public async getStreamQualities(channelName: string): Promise<string[]> {
    try {
      logger.debug('配信品質オプションを取得中...', '📊');

      // まずtwitch-streamlink-extractorで試す
      try {
        const streamData: TwitchStreamQuality[] = await twitchStreamlinkExtractor.extract(
          channelName,
          this.clientId,
          this.deviceId,
          this.accessToken !== 'undefined' ? this.accessToken : undefined,
          this.userAgent
        );

        if (streamData && streamData.length > 0) {
          const qualities = streamData.map(stream => stream.quality);
          logger.success(`${qualities.length}個の品質オプションを取得しました`);
          return qualities;
        }
      } catch (extractorError) {
        logger.debug('品質オプション取得に失敗', '📊❌');
      }

      // 基本的な品質オプションを返す
      return ['best', '720p', '480p', '360p', 'worst'];

    } catch (error) {
      logger.error('配信品質オプションの取得に失敗', error as Error);
      return ['best', '720p', '480p', '360p', 'worst'];
    }
  }

  /**
   * レート制限情報を取得（ダミー実装）
   */
  public getLastRateLimitInfo(): { remaining: number; reset: number } | null {
    // 新しいライブラリではレート制限情報は直接取得できないため、
    // ダミーデータを返す
    return {
      remaining: 100,
      reset: Date.now() + 60000
    };
  }

  /**
   * HTTP エラーの詳細を分析し、適切な対処法を提案
   */
  private analyzeHttpError(error: any, context: string): void {
    if (error.response) {
      const status = error.response.status;
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      const url = error.config?.url || 'UNKNOWN';
      
      switch (status) {
        case 405:
          logger.error(`HTTP 405 Method Not Allowed - ${context}`, new Error(`${method} ${url} は許可されていません。APIエンドポイントまたはHTTPメソッドが正しくない可能性があります。`));
          break;
        case 401:
          logger.error(`HTTP 401 Unauthorized - ${context}`, new Error(`認証が必要です。アクセストークンを確認してください。`));
          break;
        case 403:
          logger.error(`HTTP 403 Forbidden - ${context}`, new Error(`アクセスが拒否されました。権限またはスコープを確認してください。`));
          break;
        case 404:
          logger.error(`HTTP 404 Not Found - ${context}`, new Error(`リソースが見つかりません: ${url}`));
          break;
        case 429:
          logger.error(`HTTP 429 Too Many Requests - ${context}`, new Error(`レート制限に達しました。しばらく待ってから再試行してください。`));
          break;
        default:
          logger.error(`HTTP ${status} - ${context}`, new Error(`${method} ${url} でエラーが発生しました`));
      }
    } else if (error.code) {
      logger.error(`Network Error - ${context}`, new Error(`接続エラー: ${error.code} - ${error.message}`));
    } else {
      logger.error(`Unknown Error - ${context}`, error);
    }
  }
}
