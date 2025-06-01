import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

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

export class TwitchService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private baseURL = 'https://api.twitch.tv/helix';

  constructor(clientId: string, clientSecret: string, accessToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = accessToken;
  }

  /**
   * アクセストークンの有効性を確認
   */
  public async validateToken(): Promise<boolean> {
    try {
      logger.debug('Twitchトークンの有効性をチェック中...', '🔑');
      
      const response = await axios.get(`${this.baseURL}/users`, {
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
      
      const response = await axios.get(`${this.baseURL}/streams`, {
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
   * より安定した複数の方法でTwitchストリームURLを取得
   */
  public async getStreamPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.twitch(`プレイリストURLを取得中: ${channelName}`);

      // 方法1: 最新のClient-IDとシンプルなクエリを使用
      const result = await this.getPlaylistUrlMethod1(channelName);
      if (result) return result;

      // 方法2: 代替のClient-IDとクエリを使用
      const result2 = await this.getPlaylistUrlMethod2(channelName);
      if (result2) return result2;

      // 方法3: フォールバック - yt-dlpスタイルの取得
      const result3 = await this.getPlaylistUrlFallback(channelName);
      if (result3) return result3;

      logger.error(`すべての方法でプレイリストURL取得に失敗: ${channelName}`);
      return null;

    } catch (error) {
      logger.error(`プレイリストURLの取得に失敗: ${channelName}`, error as Error);
      return null;
    }
  }

  /**
   * 方法1: 最新のClient-IDを使用したシンプルなアプローチ
   */
  private async getPlaylistUrlMethod1(channelName: string): Promise<string | null> {
    try {
      const clientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
      logger.debug('方法1: 最新Client-IDでトークン取得中...');

      const query = {
        operationName: 'PlaybackAccessToken',
        query: `
          query PlaybackAccessToken($login: String!) {
            streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: "site"}) {
              value
              signature
            }
          }
        `,
        variables: { login: channelName }
      };

      const response = await axios.post('https://gql.twitch.tv/gql', [query], {
        headers: {
          'Client-ID': clientId,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const tokenData = response.data?.[0]?.data?.streamPlaybackAccessToken;
      if (!tokenData?.value || !tokenData?.signature) {
        logger.debug('方法1: トークンデータが無効');
        return null;
      }

      const playlistUrl = this.buildPlaylistUrl(channelName, clientId, tokenData.value, tokenData.signature);
      logger.success('方法1: プレイリストURL取得成功');
      return playlistUrl;

    } catch (error: any) {
      logger.debug(`方法1失敗: ${error.message}`);
      return null;
    }
  }

  /**
   * 方法2: 代替Client-IDを使用
   */
  private async getPlaylistUrlMethod2(channelName: string): Promise<string | null> {
    try {
      const clientId = 'ue6666qo983tsx6so1t0vnawi233wa';
      logger.debug('方法2: 代替Client-IDでトークン取得中...');

      const query = {
        operationName: 'PlaybackAccessToken_Template',
        query: `
          query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {
            streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {
              value
              signature
            }
          }
        `,
        variables: {
          login: channelName,
          isLive: true,
          vodID: '',
          isVod: false,
          playerType: 'site'
        }
      };

      const response = await axios.post('https://gql.twitch.tv/gql', query, {
        headers: {
          'Client-ID': clientId,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const tokenData = response.data?.data?.streamPlaybackAccessToken;
      if (!tokenData?.value || !tokenData?.signature) {
        logger.debug('方法2: トークンデータが無効');
        return null;
      }

      const playlistUrl = this.buildPlaylistUrl(channelName, clientId, tokenData.value, tokenData.signature);
      logger.success('方法2: プレイリストURL取得成功');
      return playlistUrl;

    } catch (error: any) {
      logger.debug(`方法2失敗: ${error.message}`);
      return null;
    }
  }

  /**
   * 方法3: フォールバック - 直接URLアクセス
   */
  private async getPlaylistUrlFallback(channelName: string): Promise<string | null> {
    try {
      logger.debug('方法3: フォールバック方式でURL構築中...');
      
      // 直接的なプレイリストURLを構築（トークンなし）
      const fallbackUrl = `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?allow_source=true&allow_audio_only=true`;
      
      // URLの有効性をテスト
      const testResponse = await axios.head(fallbackUrl, { 
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (testResponse.status === 200) {
        logger.success('方法3: フォールバックURL取得成功');
        return fallbackUrl;
      }

    } catch (error: any) {
      logger.debug(`方法3失敗: ${error.message}`);
    }
    
    return null;
  }

  /**
   * プレイリストURLを構築
   */
  private buildPlaylistUrl(channelName: string, clientId: string, token: string, signature: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      token: token,
      sig: signature,
      allow_source: 'true',
      allow_audio_only: 'true',
      p: Math.floor(Math.random() * 1000000).toString(),
      platform: 'web',
      player_backend: 'mediaplayer',
      playlist_include_framerate: 'true'
    });

    return `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?${params.toString()}`;
  }

  /**
   * 配信の品質オプションを取得
   */
  public async getStreamQualities(playlistUrl: string): Promise<string[]> {
    try {
      logger.debug('配信品質オプションを取得中...', '📊');

      const response = await axios.get(playlistUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const playlist = response.data;
      const qualities: string[] = [];
      
      // M3U8プレイリストから品質情報を抽出
      const lines = playlist.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          // 品質情報を抽出
          const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
          const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
          
          if (resolutionMatch && bandwidthMatch) {
            const resolution = resolutionMatch[1];
            const bandwidth = parseInt(bandwidthMatch[1]);
            const quality = `${resolution} (${Math.round(bandwidth / 1000)}k)`;
            qualities.push(quality);
          }
        }
      }

      logger.success(`${qualities.length}個の品質オプションを発見`);
      return qualities;

    } catch (error) {
      logger.error('配信品質の取得に失敗', error as Error);
      return [];
    }
  }

  /**
   * レート制限情報を取得
   */
  public getLastRateLimitInfo(): { remaining: number; reset: number } | null {
    // 最後のレスポンスヘッダーからレート制限情報を取得
    // 実装は省略（必要に応じて実装）
    return null;
  }
}
