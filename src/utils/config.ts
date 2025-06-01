import dotenv from 'dotenv';
import { AppConfig } from '../types';

// 環境変数を読み込み
dotenv.config();

export class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AppConfig {
    // Twitch必須環境変数のチェック
    const requiredTwitchEnvVars = [
      'TWITCH_CLIENT_ID',
      'TWITCH_CLIENT_SECRET', 
      'TWITCH_ACCESS_TOKEN',
      'TWITCH_CHANNEL_NAME'
    ];

    for (const envVar of requiredTwitchEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`❌ 必須環境変数 ${envVar} が設定されていません！`);
      }
    }

    // YouTube環境変数は任意（設定されていない場合は警告のみ）
    const hasYouTubeConfig = process.env.YOUTUBE_STREAM_KEY || 
                             (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
    
    if (!hasYouTubeConfig) {
      console.warn('⚠️  YouTube配信設定が見つかりません。読み取り専用モードで動作します。');
      console.warn('   完全な機能を使用するには、YOUTUBE_STREAM_KEYまたはOAuth認証情報を設定してください。');
    }

    return {
      twitch: {
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
        accessToken: process.env.TWITCH_ACCESS_TOKEN!,
        channelName: process.env.TWITCH_CHANNEL_NAME!,
      },      youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || '',
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
        channelId: process.env.YOUTUBE_CHANNEL_ID || '',
        rtmpUrl: process.env.YOUTUBE_RTMP_URL || 'rtmp://a.rtmp.youtube.com/live2/',
        streamKey: process.env.YOUTUBE_STREAM_KEY || '',
        // サムネイル設定
        autoUploadThumbnail: process.env.AUTO_UPLOAD_THUMBNAIL !== 'false', // デフォルトtrue
        customThumbnailPath: process.env.CUSTOM_THUMBNAIL_PATH || '',
        thumbnailQuality: process.env.THUMBNAIL_QUALITY || '1080p',
        // タイトル設定
        customTitle: process.env.CUSTOM_YOUTUBE_TITLE || '',
        autoTitleFormat: process.env.AUTO_TITLE_FORMAT || '[ミラー配信] {title} - {streamer}',        includeStreamerName: process.env.INCLUDE_STREAMER_NAME !== 'false', // デフォルトtrue
        includeTwitchTitle: process.env.INCLUDE_TWITCH_TITLE !== 'false', // デフォルトtrue
        includeGameName: process.env.INCLUDE_GAME_NAME !== 'false', // デフォルトtrue
      },
      archive: {
        privacyStatus: (process.env.ARCHIVE_PRIVACY_STATUS as 'public' | 'unlisted' | 'private') || 'public',
        enableProcessing: process.env.ENABLE_ARCHIVE_PROCESSING !== 'false', // デフォルトtrue
        titleFormat: process.env.ARCHIVE_TITLE_FORMAT || '[アーカイブ] {originalTitle} - {date}',
        descriptionTemplate: process.env.ARCHIVE_DESCRIPTION_TEMPLATE || 'この動画は{date}に行われたライブ配信のアーカイブです。\n配信者: {streamer}\nゲーム: {game}\n配信時間: {duration}\n\n元の配信: https://www.twitch.tv/{channel}',
      },
      app: {
        checkInterval: parseInt(process.env.CHECK_INTERVAL || '30000'),
        retryCount: parseInt(process.env.RETRY_COUNT || '3'),
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
      },
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getTwitchConfig() {
    return this.config.twitch;
  }
  public getYouTubeConfig() {
    return this.config.youtube;
  }

  public getArchiveConfig() {
    return this.config.archive;
  }

  public getAppConfig() {
    return this.config.app;
  }

  // 設定値の動的更新（必要に応じて）
  public updateConfig(updates: Partial<AppConfig>) {
    this.config = { ...this.config, ...updates };
  }

  // デバッグ用設定出力（機密情報は隠す）
  public getConfigForDebug() {
    return {
      twitch: {
        clientId: this.maskSensitiveValue(this.config.twitch.clientId),
        channelName: this.config.twitch.channelName,
      },
      youtube: {
        channelId: this.config.youtube.channelId,
        rtmpUrl: this.config.youtube.rtmpUrl,
        hasStreamKey: !!this.config.youtube.streamKey,
        hasAuth: !!(this.config.youtube.clientId && this.config.youtube.clientSecret),
      },
      app: this.config.app,
    };
  }

  private maskSensitiveValue(value: string): string {
    if (!value || value.length <= 8) return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  // YouTube設定の有効性をチェック
  public hasValidYouTubeConfig(): boolean {
    return !!(this.config.youtube.streamKey || 
              (this.config.youtube.clientId && this.config.youtube.clientSecret));
  }
}

// シングルトンインスタンスをエクスポート
export const config = Config.getInstance();
