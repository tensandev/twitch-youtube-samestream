// Twitch API関連の型定義
export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: 'live' | '';
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchApiResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
  };
}

// YouTube API関連の型定義
export interface YouTubeLiveStream {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      [key: string]: {
        url: string;
        width: number;
        height: number;
      };
    };
    channelTitle: string;
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: 'private' | 'public' | 'unlisted';
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
    madeForKids: boolean;
    selfDeclaredMadeForKids: boolean;
  };
  liveStreamingDetails?: {
    actualStartTime?: string;
    actualEndTime?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    concurrentViewers?: string;
    activeLiveChatId?: string;
  };
}

// アプリケーション設定の型定義
export interface AppConfig {
  twitch: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    channelName: string;
  };  youtube: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    channelId: string;
    rtmpUrl: string;
    streamKey: string;
    // サムネイル設定
    autoUploadThumbnail: boolean;
    customThumbnailPath: string;
    thumbnailQuality: string;
    // タイトル設定
    customTitle: string;
    autoTitleFormat: string;
    includeStreamerName: boolean;
    includeTwitchTitle: boolean;
    includeGameName: boolean;
  };
  archive: {
    privacyStatus: 'public' | 'unlisted' | 'private';
    enableProcessing: boolean;
    titleFormat: string;
    descriptionTemplate: string;
  };
  app: {
    checkInterval: number;
    retryCount: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

// ストリーミング状態の型定義
export interface StreamingStatus {
  isStreaming: boolean;
  twitchStream?: TwitchStream;
  youtubeStream?: YouTubeLiveStream;
  youtubeBroadcastId?: string;  // YouTube Live配信IDを追加
  youtubeStreamId?: string;     // YouTube ストリームIDを追加
  startedAt?: Date;
  error?: string;
}

// ログレベルの型定義
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// RTMPストリーム設定の型定義
export interface RTMPStreamConfig {
  input: string;
  output: string;
  options?: {
    videoBitrate?: number;
    audioBitrate?: number;
    videoCodec?: string;
    audioCodec?: string;
    preset?: string;
    fps?: number;
    resolution?: string;
  };
}
