import axios, { AxiosInstance } from 'axios';
import { TwitchStream, TwitchApiResponse, TwitchUser } from '../types';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class TwitchService {
  private apiClient: AxiosInstance;
  private twitchConfig = config.getTwitchConfig();
  
  constructor() {
    this.apiClient = axios.create({
      baseURL: 'https://api.twitch.tv/helix',
      headers: {
        'Client-ID': this.twitchConfig.clientId,
        'Authorization': `Bearer ${this.twitchConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // リクエスト/レスポンスのインターセプター
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // リクエストインターセプター
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug(`Twitch APIリクエスト: ${config.method?.toUpperCase()} ${config.url}`, '📤');
        return config;
      },
      (error) => {
        logger.error('Twitch APIリクエストエラー', error, '📤❌');
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug(`Twitch APIレスポンス: ${response.status} ${response.config.url}`, '📥');
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          logger.warn('Twitch APIアクセストークンが無効です。更新が必要です。', '🔑⚠️');
        }
        logger.error(`Twitch APIエラー: ${error.response?.status || 'Network Error'}`, error, '📥❌');
        return Promise.reject(error);
      }
    );
  }

  /**
   * 指定したチャンネルのユーザー情報を取得
   */
  public async getUserByLogin(login: string): Promise<TwitchUser | null> {
    try {
      logger.twitch(`ユーザー情報を取得中: ${login}`);
      
      const response = await this.apiClient.get<TwitchApiResponse<TwitchUser>>('/users', {
        params: { login }
      });

      if (response.data.data.length === 0) {
        logger.warn(`ユーザーが見つかりません: ${login}`, '👤❌');
        return null;
      }

      const user = response.data.data[0];
      logger.twitch(`ユーザー情報を取得しました: ${user.display_name} (ID: ${user.id})`);
      return user;
    } catch (error) {
      logger.error(`ユーザー情報の取得に失敗: ${login}`, error as Error);
      return null;
    }
  }

  /**
   * 指定したチャンネルの配信状況をチェック
   */
  public async getStreamStatus(channelName: string): Promise<TwitchStream | null> {
    try {
      logger.twitch(`配信状況をチェック中: ${channelName}`);

      const response = await this.apiClient.get<TwitchApiResponse<TwitchStream>>('/streams', {
        params: { user_login: channelName }
      });

      if (response.data.data.length === 0) {
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
   * 代替方法: yt-dlp/streamlinkと同様のアプローチ
   */
  public async getStreamPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.twitch(`プレイリストURLを取得中: ${channelName}`);

      // 複数のClient-IDを試す
      const clientIds = [
        'kimne78kx3ncx6brgo4mv6wki5h1ko', // 一般的なClient-ID
        'ue6666qo983tsx6so1t0vnawi233wa', // 代替Client-ID
        'jzkbprff40iqj646a697cyrvl0zt2m6', // 別の代替Client-ID
      ];

      let tokenData = null;
      let usedClientId = null;

      for (const clientId of clientIds) {
        try {
          logger.debug(`Client-ID ${clientId} でトークン取得を試行中...`);
          
          const tokenQuery = [{
            operationName: 'PlaybackAccessToken_Template',
            query: `query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {
              streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {
                value
                signature
              }
              videoPlaybackAccessToken(id: $vodID, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {
                value
                signature
              }
            }`,
            variables: {
              login: channelName,
              isLive: true,
              vodID: '',
              isVod: false,
              playerType: 'site'
            }
          }];

          const response = await axios.post('https://gql.twitch.tv/gql', tokenQuery, {
            headers: {
              'Client-ID': clientId,
              'Content-Type': 'application/json',
            },
            timeout: 5000
          });

          // レスポンス構造を確認
          if (Array.isArray(response.data) && response.data[0]?.data?.streamPlaybackAccessToken) {
            tokenData = response.data[0].data.streamPlaybackAccessToken;
            usedClientId = clientId;
            logger.success(`Client-ID ${clientId} でトークン取得成功`);
            break;
          } else if (response.data?.data?.streamPlaybackAccessToken) {
            tokenData = response.data.data.streamPlaybackAccessToken;
            usedClientId = clientId;
            logger.success(`Client-ID ${clientId} でトークン取得成功`);
            break;
          }
        } catch (error: any) {
          logger.debug(`Client-ID ${clientId} でのトークン取得失敗: ${error.message}`);
          continue;
        }
      }

      if (!tokenData || !usedClientId) {
        logger.error('すべてのClient-IDでトークン取得に失敗しました');
        
        // 最後の手段: 簡易版のURLを試す（品質は限定的）
        logger.warn('フォールバック: 簡易的なプレイリストURLを試行中...');
        const fallbackUrl = `https://www.twitch.tv/${channelName}`;
        logger.info(`フォールバックURL: ${fallbackUrl}`);
        return fallbackUrl;
      }

      const { value, signature } = tokenData;
      
      // プレイリストURLを構築
      const playlistUrl = `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?` + 
        `client_id=${usedClientId}&` +
        `token=${encodeURIComponent(value)}&` +
        `sig=${signature}&` +
        `allow_source=true&` +
        `allow_audio_only=true&` +
        `allow_spectre=true&` +
        `p=${Math.floor(Math.random() * 1000000)}&` +
        `platform=web&` +
        `player_backend=mediaplayer&` +
        `playlist_include_framerate=true&` +
        `reassignments_supported=true&` +
        `cdm=wv&` +
        `supported_codecs=avc1,h265,vp9`;

      logger.success(`プレイリストURLを取得しました: ${channelName}`);
      logger.debug(`URL: ${playlistUrl.substring(0, 150)}...`);

      // URLが有効かテスト
      try {
        const testResponse = await axios.head(playlistUrl, { timeout: 3000 });
        if (testResponse.status === 200) {
          logger.success('プレイリストURLは有効です');
        }
      } catch (error) {
        logger.warn('プレイリストURLの検証に失敗しましたが、続行します');
      }

      return playlistUrl;
    } catch (error) {
      logger.error(`プレイリストURLの取得に失敗: ${channelName}`, error as Error);
      return null;
    }
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

      // M3U8プレイリストから品質オプションを解析
      const qualities: string[] = [];
      const lines = playlist.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
          const qualityLine = lines[i];
          const nextLine = lines[i + 1];
          
          if (nextLine && nextLine.startsWith('http')) {
            const resolution = qualityLine.match(/RESOLUTION=(\d+x\d+)/)?.[1];
            const bandwidth = qualityLine.match(/BANDWIDTH=(\d+)/)?.[1];
            
            qualities.push(nextLine);
            logger.debug(`品質オプション: ${resolution || 'unknown'} (${bandwidth ? Math.round(parseInt(bandwidth) / 1000) + 'kbps' : 'unknown bitrate'})`);
          }
        }
      }

      logger.info(`${qualities.length}個の品質オプションを発見しました`, '📊');
      return qualities;
    } catch (error) {
      logger.error('配信品質オプションの取得に失敗', error as Error);
      return [];
    }
  }

  /**
   * アクセストークンの有効性をチェック
   */
  public async validateToken(): Promise<boolean> {
    try {
      logger.debug('Twitchトークンの有効性をチェック中...', '🔑');
      
      const response = await this.apiClient.get('/users');
      
      if (response.status === 200) {
        logger.success('Twitchトークンは有効です');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Twitchトークンが無効です', error as Error, '🔑❌');
      return false;
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
