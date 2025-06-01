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
    
    logger.info('🎮 改良版TwitchService初期化完了', '✨');
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
      
      const axios = require('axios');
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
  }

  /**
   * 配信のプレイリストURL（M3U8）を取得する
   * 安定した twitch-streamlink-extractor を使用
   */
  public async getStreamPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.twitch(`プレイリストURLを取得中: ${channelName}`);
      logger.info('🔧 改良版ストリーム抽出器を使用中...', '✨');

      // twitch-streamlink-extractorを使用してストリームURLを取得
      const streamData: TwitchStreamQuality[] = await twitchStreamlinkExtractor.extract(
        channelName,
        this.clientId,
        this.deviceId,
        this.accessToken !== 'undefined' ? this.accessToken : undefined,
        this.userAgent
      );

      if (!streamData || streamData.length === 0) {
        logger.warn(`プレイリストURLが見つかりません: ${channelName}`, '🔍❌');
        return null;
      }

      // 最高品質のストリームを選択（通常は最初のもの）
      const bestQuality = streamData[0];
      logger.success(`プレイリストURLを取得しました: ${channelName}`);
      logger.info(`品質: ${bestQuality.quality}`, '📊');
      logger.debug(`URL: ${bestQuality.link.substring(0, 100)}...`, '🔗');

      // 利用可能な品質オプションをログ出力
      const qualities = streamData.map(stream => stream.quality).join(', ');
      logger.info(`利用可能な品質: ${qualities}`, '🎬');

      return bestQuality.link;

    } catch (error) {
      logger.error(`プレイリストURLの取得に失敗: ${channelName}`, error as Error);
      
      // フォールバック: 旧方式も試してみる
      logger.warn('フォールバック方式を試行中...', '🔄');
      return this.getFallbackPlaylistUrl(channelName);
    }
  }

  /**
   * フォールバック: 簡易的なプレイリストURL生成
   */
  private async getFallbackPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.debug('フォールバック: 簡易URL構築中...', '🔄');
      
      // 基本的なURL（品質は限定的）
      const fallbackUrl = `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?allow_source=true&allow_audio_only=true`;
      
      // URLの有効性をテスト
      const axios = require('axios');
      try {
        const testResponse = await axios.head(fallbackUrl, { 
          timeout: 5000,
          headers: {
            'User-Agent': this.userAgent
          }
        });
        
        if (testResponse.status === 200) {
          logger.info('フォールバックURL取得成功', '🔄✅');
          return fallbackUrl;
        }
      } catch (testError) {
        logger.debug('フォールバックURLテスト失敗', '🔄❌');
      }

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

      const streamData: TwitchStreamQuality[] = await twitchStreamlinkExtractor.extract(
        channelName,
        this.clientId,
        this.deviceId,
        this.accessToken !== 'undefined' ? this.accessToken : undefined,
        this.userAgent
      );

      if (!streamData || streamData.length === 0) {
        logger.warn('品質オプションが見つかりません', '📊❌');
        return [];
      }

      const qualities = streamData.map(stream => stream.quality);
      logger.success(`${qualities.length}個の品質オプションを取得しました`);
      return qualities;

    } catch (error) {
      logger.error('配信品質オプションの取得に失敗', error as Error);
      return [];
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
}
