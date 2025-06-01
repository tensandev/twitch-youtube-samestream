import { google, youtube_v3 } from 'googleapis';
import axios from 'axios';
import { YouTubeLiveStream } from '../types';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import * as fs from 'fs';
import * as path from 'path';

export class YouTubeService {
  private youtube: youtube_v3.Youtube;
  private youtubeConfig = config.getYouTubeConfig();
  private oauth2Client: any;

  constructor() {
    this.setupGoogleAuth();
    this.youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
  }

  private setupGoogleAuth(): void {
    if (this.youtubeConfig.clientId && this.youtubeConfig.clientSecret) {
      // OAuth2認証の設定
      this.oauth2Client = new google.auth.OAuth2(
        this.youtubeConfig.clientId,
        this.youtubeConfig.clientSecret,
        'http://localhost:3000/oauth2callback' // リダイレクトURL
      );

      if (this.youtubeConfig.refreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: this.youtubeConfig.refreshToken,
        });
      }
    } else {
      // APIキーのみの認証（読み取り専用）
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.youtubeConfig.apiKey,
      });
    }
  }

  /**
   * YouTube Live配信を作成
   */
  public async createLiveBroadcast(title: string, description: string, scheduledStartTime?: string): Promise<string | null> {
    try {
      logger.youtube('YouTube Live配信を作成中...');

      const broadcast = await this.youtube.liveBroadcasts.insert({
        part: ['snippet', 'status', 'contentDetails'],
        requestBody: {
          snippet: {
            title: title,
            description: description,
            scheduledStartTime: scheduledStartTime || new Date().toISOString(),
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            recordFromStart: true,
            enableDvr: true,
            enableContentEncryption: false,
            enableEmbed: true,
            projection: 'rectangular',
          },
        },
      });

      if (broadcast.data.id) {
        logger.success(`YouTube Live配信を作成しました: ${broadcast.data.id}`);
        logger.youtube(`タイトル: ${title}`);
        return broadcast.data.id;
      }

      return null;
    } catch (error) {
      logger.error('YouTube Live配信の作成に失敗', error as Error);
      return null;
    }
  }

  /**
   * YouTube Live Stream（ストリーム設定）を作成
   */
  public async createLiveStream(title: string): Promise<{ streamId: string; streamKey: string; rtmpUrl: string } | null> {
    try {
      logger.youtube('YouTube Liveストリームを作成中...');

      const stream = await this.youtube.liveStreams.insert({
        part: ['snippet', 'cdn'],
        requestBody: {
          snippet: {
            title: title,
          },
          cdn: {
            frameRate: '30fps',
            ingestionType: 'rtmp',
            resolution: '1080p',
          },
        },
      });

      if (stream.data.id && stream.data.cdn) {
        const streamId = stream.data.id;
        const streamKey = stream.data.cdn.ingestionInfo?.streamName || '';
        const rtmpUrl = stream.data.cdn.ingestionInfo?.ingestionAddress || '';

        logger.success(`YouTube Liveストリームを作成しました: ${streamId}`);
        logger.youtube(`RTMP URL: ${rtmpUrl}`);
        logger.youtube(`Stream Key: ${streamKey.substring(0, 8)}...`);

        return { streamId, streamKey, rtmpUrl };
      }

      return null;
    } catch (error) {
      logger.error('YouTube Liveストリームの作成に失敗', error as Error);
      return null;
    }
  }

  /**
   * 配信とストリームをバインド
   */
  public async bindStreamToBroadcast(broadcastId: string, streamId: string): Promise<boolean> {
    try {
      logger.youtube('配信とストリームをバインド中...');

      await this.youtube.liveBroadcasts.bind({
        part: ['id'],
        id: broadcastId,
        streamId: streamId,
      });

      logger.success('配信とストリームのバインドが完了しました');
      return true;
    } catch (error) {
      logger.error('配信とストリームのバインドに失敗', error as Error);
      return false;
    }
  }  /**
   * ライブ配信を開始（従来のメソッド - 互換性のため残す）
   */
  public async transitionBroadcast(broadcastId: string, broadcastStatus: 'live' | 'complete'): Promise<boolean> {
    try {
      logger.youtube(`配信ステータスを変更中: ${broadcastStatus}`);

      // 現在のステータスを確認
      const currentStatus = await this.getBroadcastStatus(broadcastId);
      logger.youtube(`現在のBroadcast Status: ${currentStatus}`);

      // 既に目的のステータスの場合はスキップ
      if (currentStatus === broadcastStatus) {
        logger.info(`Broadcastは既に${broadcastStatus}ステータスです`, '✅');
        return true;
      }

      // 'created'または'ready'ステータスの場合、まず'testing'に遷移
      if ((currentStatus === 'created' || currentStatus === 'ready') && broadcastStatus === 'live') {
        logger.youtube('まず testing ステータスに遷移します...');
        await this.youtube.liveBroadcasts.transition({
          part: ['status'],
          id: broadcastId,
          broadcastStatus: 'testing',
        });
        
        // testing状態で少し待機
        logger.info('3秒待機中...', '⏳');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // 最終的なステータスに遷移
      await this.youtube.liveBroadcasts.transition({
        part: ['status'],
        id: broadcastId,
        broadcastStatus: broadcastStatus,
      });

      if (broadcastStatus === 'live') {
        logger.streaming('🔴 YouTube Live配信が開始されました！');
      } else {
        logger.info('YouTube Live配信が終了されました', '⏹️');
      }

      return true;
    } catch (error) {
      logger.error(`配信ステータスの変更に失敗: ${broadcastStatus}`, error as Error);
      return false;
    }
  }

  /**
   * チャンネル情報を取得
   */
  public async getChannelInfo(channelId?: string): Promise<any> {
    try {
      logger.youtube('チャンネル情報を取得中...');

      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: channelId ? [channelId] : undefined,
        mine: !channelId,
      });

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        logger.youtube(`チャンネル: ${channel.snippet?.title}`);
        return channel;
      }

      return null;
    } catch (error) {
      logger.error('チャンネル情報の取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * 現在のライブ配信一覧を取得
   */
  public async getCurrentLiveBroadcasts(): Promise<YouTubeLiveStream[]> {
    try {
      logger.youtube('現在のライブ配信一覧を取得中...');

      const response = await this.youtube.liveBroadcasts.list({
        part: ['snippet', 'status', 'contentDetails'],
        broadcastStatus: 'active',
        mine: true,
      });

      const broadcasts: YouTubeLiveStream[] = response.data.items?.map(item => ({
        id: item.id!,
        snippet: item.snippet! as any,
        status: item.status! as any,
        liveStreamingDetails: item.contentDetails as any,
      })) || [];

      logger.info(`${broadcasts.length}個のアクティブな配信を発見`, '📺');
      return broadcasts;
    } catch (error) {
      logger.error('ライブ配信一覧の取得に失敗', error as Error);
      return [];
    }
  }

  /**
   * 配信統計情報を取得
   */
  public async getBroadcastStatistics(broadcastId: string): Promise<any> {
    try {
      const response = await this.youtube.videos.list({
        part: ['liveStreamingDetails', 'statistics'],
        id: [broadcastId],
      });

      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        const concurrentViewers = video.liveStreamingDetails?.concurrentViewers;
        
        if (concurrentViewers) {
          logger.stats({
            '配信ID': broadcastId,
            '同時視聴者数': concurrentViewers,
            '総視聴回数': video.statistics?.viewCount || 'N/A',
            'いいね数': video.statistics?.likeCount || 'N/A',
          });
        }

        return video;
      }

      return null;
    } catch (error) {
      logger.error('配信統計情報の取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * 認証状態をチェック
   */
  public async checkAuth(): Promise<boolean> {
    try {
      logger.debug('YouTube API認証状態をチェック中...', '🔑');
      
      const response = await this.youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });

      if (response.data.items && response.data.items.length > 0) {
        logger.success('YouTube API認証は有効です');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('YouTube API認証が無効です', error as Error, '🔑❌');
      return false;
    }
  }

  /**
   * OAuth2認証URLを生成
   */
  public generateAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth2クライアントが設定されていません');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
    });

    logger.info('OAuth2認証URLを生成しました', '🔗');
    return authUrl;
  }

  /**
   * 認証コードからトークンを取得
   */
  public async getTokenFromCode(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      logger.success('YouTube OAuth2トークンを取得しました');
      return tokens;
    } catch (error) {
      logger.error('YouTube OAuth2トークンの取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * リフレッシュトークンを使ってアクセストークンを更新
   */
  public async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.oauth2Client || !this.youtubeConfig.refreshToken) {
        logger.warn('リフレッシュトークンが設定されていません', '🔄');
        return false;
      }

      logger.debug('YouTube アクセストークンを更新中...', '🔄');
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      
      logger.success('YouTube アクセストークンを更新しました');
      return true;
    } catch (error) {
      logger.error('YouTube アクセストークンの更新に失敗', error as Error);
      return false;
    }
  }
  /**
   * Streamのステータスを確認
   */
  public async getStreamStatus(streamId: string): Promise<string | null> {
    try {
      logger.youtube('Streamのステータスを確認中...');

      const response = await this.youtube.liveStreams.list({
        part: ['status'],
        id: [streamId],
      });

      if (response.data.items && response.data.items.length > 0) {
        const streamStatus = response.data.items[0].status?.streamStatus;
        logger.youtube(`Stream Status: ${streamStatus}`);
        return streamStatus || null;
      }

      return null;
    } catch (error) {
      logger.error('Streamステータスの取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * Broadcastのステータスを確認
   */
  public async getBroadcastStatus(broadcastId: string): Promise<string | null> {
    try {
      logger.youtube('Broadcastのステータスを確認中...');

      const response = await this.youtube.liveBroadcasts.list({
        part: ['status'],
        id: [broadcastId],
      });

      if (response.data.items && response.data.items.length > 0) {
        const broadcastStatus = response.data.items[0].status?.lifeCycleStatus;
        logger.youtube(`Broadcast Status: ${broadcastStatus}`);
        return broadcastStatus || null;
      }

      return null;
    } catch (error) {
      logger.error('Broadcastステータスの取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * ライブ配信を安全に開始（prerequisiteチェック付き）
   */
  public async transitionBroadcastSafely(broadcastId: string, streamId: string, broadcastStatus: 'testing' | 'live' | 'complete'): Promise<boolean> {
    try {
      logger.youtube(`配信ステータスを安全に変更中: ${broadcastStatus}`);

      // Stream statusが'active'であることを確認
      if (broadcastStatus === 'testing' || broadcastStatus === 'live') {
        const streamStatus = await this.getStreamStatus(streamId);
        
        if (streamStatus !== 'active') {
          logger.warn(`ストリームがアクティブではありません (status: ${streamStatus}). 30秒待機します...`, '⏳');
          
          // 30秒待機してから再度確認
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          const retryStreamStatus = await this.getStreamStatus(streamId);
          if (retryStreamStatus !== 'active') {
            logger.error(`ストリームがまだアクティブではありません (status: ${retryStreamStatus}). 遷移を中止します。`, new Error('Stream not active'));
            return false;
          }
          
          logger.success('ストリームがアクティブになりました');
        }
      }

      // Current broadcast statusを確認
      const currentStatus = await this.getBroadcastStatus(broadcastId);
      logger.youtube(`現在のBroadcast Status: ${currentStatus}`);

      // 既に目的のステータスの場合はスキップ
      if (currentStatus === broadcastStatus) {
        logger.info(`Broadcastは既に${broadcastStatus}ステータスです`, '✅');
        return true;
      }

      // 有効な遷移かチェック
      if (!this.isValidTransition(currentStatus, broadcastStatus)) {
        logger.error(`無効な遷移: ${currentStatus} -> ${broadcastStatus}`, new Error('Invalid transition'));
        return false;
      }

      // ステータス遷移実行
      await this.youtube.liveBroadcasts.transition({
        part: ['status'],
        id: broadcastId,
        broadcastStatus: broadcastStatus,
      });

      if (broadcastStatus === 'live') {
        logger.streaming('🔴 YouTube Live配信が開始されました！');
      } else if (broadcastStatus === 'testing') {
        logger.youtube('🧪 YouTube Live配信をテストモードに移行しました');
      } else {
        logger.info('YouTube Live配信が終了されました', '⏹️');
      }

      return true;
    } catch (error: any) {
      // より詳細なエラー分析
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        logger.error(`YouTube API エラー [${apiError.code}]: ${apiError.message}`, error as Error);
        
        if (apiError.errors && apiError.errors.length > 0) {
          apiError.errors.forEach((err: any) => {
            logger.error(`  - ${err.reason}: ${err.message}`, new Error(err.message));
          });
        }
      } else {
        logger.error(`配信ステータスの変更に失敗: ${broadcastStatus}`, error as Error);
      }
      return false;
    }
  }

  /**
   * ステータス遷移の有効性をチェック
   */
  private isValidTransition(currentStatus: string | null, targetStatus: string): boolean {
    // YouTube Live Streaming API のステータス遷移ルール
    const validTransitions: { [key: string]: string[] } = {
      'created': ['testing', 'live'],
      'ready': ['testing', 'live'],
      'testing': ['live', 'complete'],
      'live': ['complete'],
      'complete': [], // completeからは遷移不可
    };

    if (!currentStatus) {
      logger.warn('現在のステータスが不明です', '⚠️');
      return true; // 不明な場合は試行する
    }

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
  }

  /**
   * ストリームとブロードキャストの準備状態を包括的にチェック
   */
  public async verifyStreamReadiness(broadcastId: string, streamId: string): Promise<boolean> {
    try {
      logger.youtube('配信準備状態を確認中...');

      // 1. ストリームのステータス確認
      const streamStatus = await this.getStreamStatus(streamId);
      logger.youtube(`Stream Status: ${streamStatus}`);

      // 2. ブロードキャストのステータス確認
      const broadcastStatus = await this.getBroadcastStatus(broadcastId);
      logger.youtube(`Broadcast Status: ${broadcastStatus}`);

      // 3. ストリームの詳細情報を取得
      const streamDetails = await this.youtube.liveStreams.list({
        part: ['snippet', 'cdn', 'status'],
        id: [streamId],
      });

      if (streamDetails.data.items && streamDetails.data.items.length > 0) {
        const stream = streamDetails.data.items[0];
        const ingestionAddress = stream.cdn?.ingestionInfo?.ingestionAddress;
        const streamName = stream.cdn?.ingestionInfo?.streamName;
        
        logger.youtube(`RTMP URL: ${ingestionAddress}`);
        logger.youtube(`Stream Key: ${streamName?.substring(0, 8)}...`);
        
        // ストリームキーとRTMP URLが正しく設定されているかチェック
        if (!ingestionAddress || !streamName) {
          logger.error('ストリーム設定が不完全です', new Error('Missing RTMP URL or Stream Key'));
          return false;
        }
      }

      // 4. ブロードキャストとストリームのバインド状態確認
      const broadcastDetails = await this.youtube.liveBroadcasts.list({
        part: ['snippet', 'status', 'contentDetails'],
        id: [broadcastId],
      });

      if (broadcastDetails.data.items && broadcastDetails.data.items.length > 0) {
        const broadcast = broadcastDetails.data.items[0];
        const boundStreamId = broadcast.contentDetails?.boundStreamId;
        
        if (boundStreamId !== streamId) {
          logger.error(`ブロードキャストとストリームのバインドが正しくありません (expected: ${streamId}, got: ${boundStreamId})`, new Error('Stream binding mismatch'));
          return false;
        }
        
        logger.success('ブロードキャストとストリームが正しくバインドされています');
      }

      // 5. 最終的な準備状態判定
      const isReady = streamStatus === 'active' && 
                     (broadcastStatus === 'ready' || broadcastStatus === 'testing' || broadcastStatus === 'live');

      if (isReady) {
        logger.success('配信準備が完了しています');
      } else {
        logger.warn(`配信準備が不完全です: Stream=${streamStatus}, Broadcast=${broadcastStatus}`, '⚠️');
      }

      return isReady;
    } catch (error) {
      logger.error('配信準備状態の確認に失敗', error as Error);
      return false;
    }
  }  /**
   * YouTube Live配信とストリームの詳細診断
   */
  public async diagnoseLiveStreamStatus(broadcastId?: string, streamId?: string): Promise<any> {
    try {
      logger.youtube('=== YouTube Live配信診断開始 ===');
      
      const result: any = {
        broadcasts: [],
        streams: [],
        summary: {}
      };
      
      // 特定のBroadcast IDが指定されている場合
      if (broadcastId) {
        const broadcastResponse = await this.youtube.liveBroadcasts.list({
          part: ['status', 'snippet', 'contentDetails'],
          id: [broadcastId],
        });
        
        if (broadcastResponse.data.items && broadcastResponse.data.items.length > 0) {
          const broadcast = broadcastResponse.data.items[0];
          logger.youtube(`Broadcast ID: ${broadcastId}`);
          logger.youtube(`Broadcast Title: ${broadcast.snippet?.title}`);
          logger.youtube(`Broadcast LifeCycle Status: ${broadcast.status?.lifeCycleStatus}`);
          logger.youtube(`Broadcast Privacy Status: ${broadcast.status?.privacyStatus}`);
          logger.youtube(`Broadcast Recording Status: ${broadcast.status?.recordingStatus}`);
          logger.youtube(`Bound Stream ID: ${broadcast.contentDetails?.boundStreamId}`);
          
          result.broadcasts.push({
            id: broadcastId,
            title: broadcast.snippet?.title,
            lifeCycleStatus: broadcast.status?.lifeCycleStatus,
            privacyStatus: broadcast.status?.privacyStatus,
            recordingStatus: broadcast.status?.recordingStatus,
            boundStreamId: broadcast.contentDetails?.boundStreamId
          });
        }
      } else {
        // すべてのBroadcastを取得
        const allBroadcasts = await this.youtube.liveBroadcasts.list({
          part: ['status', 'snippet', 'contentDetails'],
          mine: true,
          maxResults: 50
        });
        
        if (allBroadcasts.data.items) {
          logger.youtube(`見つかった配信数: ${allBroadcasts.data.items.length}`);
          result.broadcasts = allBroadcasts.data.items.map(broadcast => ({
            id: broadcast.id,
            title: broadcast.snippet?.title,
            lifeCycleStatus: broadcast.status?.lifeCycleStatus,
            privacyStatus: broadcast.status?.privacyStatus,
            recordingStatus: broadcast.status?.recordingStatus,
            boundStreamId: broadcast.contentDetails?.boundStreamId
          }));
        }
      }
      
      // 特定のStream IDが指定されている場合
      if (streamId) {
        const streamResponse = await this.youtube.liveStreams.list({
          part: ['status', 'snippet', 'cdn'],
          id: [streamId],
        });
        
        if (streamResponse.data.items && streamResponse.data.items.length > 0) {
          const stream = streamResponse.data.items[0];
          logger.youtube(`Stream ID: ${streamId}`);
          logger.youtube(`Stream Status: ${stream.status?.streamStatus}`);
          logger.youtube(`Stream Health: ${stream.status?.healthStatus?.status}`);
          logger.youtube(`Stream Format: ${stream.cdn?.format}`);
          logger.youtube(`Stream Resolution: ${stream.cdn?.resolution}`);
          logger.youtube(`Stream Framerate: ${stream.cdn?.frameRate}`);
          logger.youtube(`Stream Ingestion Type: ${stream.cdn?.ingestionType}`);
          
          // Stream Keyの確認
          if (stream.cdn?.ingestionInfo?.streamName) {
            logger.youtube(`Stream Key (末尾8文字): ...${stream.cdn.ingestionInfo.streamName.substring(stream.cdn.ingestionInfo.streamName.length - 8)}`);
          }
          
          result.streams.push({
            id: streamId,
            status: stream.status?.streamStatus,
            health: stream.status?.healthStatus?.status,
            format: stream.cdn?.format,
            resolution: stream.cdn?.resolution,
            frameRate: stream.cdn?.frameRate,
            ingestionType: stream.cdn?.ingestionType,
            hasStreamKey: !!stream.cdn?.ingestionInfo?.streamName
          });
        }
      } else {
        // すべてのStreamを取得
        const allStreams = await this.youtube.liveStreams.list({
          part: ['status', 'snippet', 'cdn'],
          mine: true,
          maxResults: 50
        });
        
        if (allStreams.data.items) {
          logger.youtube(`見つかったストリーム数: ${allStreams.data.items.length}`);
          result.streams = allStreams.data.items.map(stream => ({
            id: stream.id,
            status: stream.status?.streamStatus,
            health: stream.status?.healthStatus?.status,
            format: stream.cdn?.format,
            resolution: stream.cdn?.resolution,
            frameRate: stream.cdn?.frameRate,
            ingestionType: stream.cdn?.ingestionType,
            hasStreamKey: !!stream.cdn?.ingestionInfo?.streamName
          }));
        }
      }
      
      // サマリー情報
      result.summary = {
        totalBroadcasts: result.broadcasts.length,
        totalStreams: result.streams.length,
        activeBroadcasts: result.broadcasts.filter((b: any) => b.lifeCycleStatus === 'live').length,
        activeStreams: result.streams.filter((s: any) => s.status === 'active').length
      };
      
      logger.youtube('=== YouTube Live配信診断完了 ===');
      return result;
    } catch (error) {
      logger.error('YouTube Live配信診断に失敗', error as Error);
      return null;
    }
  }

  /**
   * カスタムサムネイルをアップロード
   */
  public async uploadThumbnail(videoId: string, thumbnailPath: string): Promise<boolean> {
    try {
      logger.youtube(`サムネイルをアップロード中... Video ID: ${videoId}`);

      // ファイルの存在確認
      if (!fs.existsSync(thumbnailPath)) {
        logger.error('サムネイルファイルが見つかりません', new Error(`File not found: ${thumbnailPath}`));
        return false;
      }

      // ファイルサイズチェック（2MB制限）
      const stats = fs.statSync(thumbnailPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 2) {
        logger.error('サムネイルファイルサイズが2MBを超えています', new Error(`File size: ${fileSizeInMB.toFixed(2)}MB`));
        return false;
      }

      // MIME タイプの検証
      const ext = path.extname(thumbnailPath).toLowerCase();
      const mimeTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png'
      };

      const mimeType = mimeTypeMap[ext];
      if (!mimeType) {
        logger.error('サポートされていないファイル形式です', new Error(`Supported formats: JPEG, PNG. Got: ${ext}`));
        return false;
      }

      // ファイルストリームを作成
      const mediaBody = fs.createReadStream(thumbnailPath);

      // サムネイルをアップロード
      const response = await this.youtube.thumbnails.set({
        videoId: videoId,
        media: {
          mimeType: mimeType,
          body: mediaBody
        }
      });

      if (response.data && response.data.items) {
        logger.success(`サムネイルのアップロードが完了しました: ${videoId}`);
        logger.youtube(`アップロード結果: ${response.data.items.length} つのサムネイルサイズが生成されました`);
        
        // 生成されたサムネイルサイズを表示
        response.data.items.forEach((item: any, index: number) => {
          if (item.default) logger.youtube(`  - デフォルト: ${item.default.url} (${item.default.width}x${item.default.height})`);
          if (item.medium) logger.youtube(`  - 中サイズ: ${item.medium.url} (${item.medium.width}x${item.medium.height})`);
          if (item.high) logger.youtube(`  - 高品質: ${item.high.url} (${item.high.width}x${item.high.height})`);
          if (item.standard) logger.youtube(`  - 標準: ${item.standard.url} (${item.standard.width}x${item.standard.height})`);
          if (item.maxres) logger.youtube(`  - 最高品質: ${item.maxres.url} (${item.maxres.width}x${item.maxres.height})`);
        });
        
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('サムネイルのアップロードに失敗', error);
      
      // 詳細なエラー情報を表示
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          logger.error(`エラーコード: ${errorData.error.code}`, error);
          logger.error(`エラーメッセージ: ${errorData.error.message}`, error);
          
          // よくあるエラーの対処法を表示
          if (errorData.error.code === 403) {
            logger.warn('カスタムサムネイル機能が無効になっている可能性があります', '⚠️');
            logger.warn('YouTube Studio > チャンネル > 機能の利用資格 でカスタムサムネイル機能を有効にしてください', '💡');
          } else if (errorData.error.code === 400) {
            logger.warn('無効な動画IDまたはファイル形式の可能性があります', '⚠️');
          } else if (errorData.error.code === 404) {
            logger.warn('指定された動画が見つかりません', '⚠️');
          } else if (errorData.error.code === 429) {
            logger.warn('アップロード制限に達しました。しばらく待ってから再試行してください', '⚠️');
          }
        }
      }
      
      return false;
    }
  }

  /**
   * Twitchのサムネイルを取得してYouTubeにアップロード
   */
  public async uploadTwitchThumbnailToYouTube(videoId: string, twitchThumbnailUrl: string): Promise<boolean> {
    try {
      logger.youtube('Twitchのサムネイルをダウンロード中...');

      // Twitchサムネイルをダウンロード
      const response = await axios.get(twitchThumbnailUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        logger.error('Twitchサムネイルのダウンロードに失敗', new Error(`HTTP ${response.status}`));
        return false;
      }

      // Content-Typeからファイル拡張子を決定
      const contentType = response.headers['content-type'] || '';
      let extension = '.jpg';
      if (contentType.includes('png')) {
        extension = '.png';
      }

      // 一時ファイルに保存
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `twitch_thumbnail_${Date.now()}${extension}`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          try {
            logger.youtube('サムネイルダウンロード完了、YouTubeにアップロード中...');
            
            // YouTubeにアップロード
            const uploadSuccess = await this.uploadThumbnail(videoId, tempFilePath);
            
            // 一時ファイルを削除
            try {
              fs.unlinkSync(tempFilePath);
              logger.youtube('一時ファイルを削除しました');
            } catch (cleanupError) {
              logger.warn('一時ファイルの削除に失敗しました', '⚠️');
            }
            
            resolve(uploadSuccess);
          } catch (error) {
            // 一時ファイルを削除
            try {
              fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
              // エラーを無視
            }
            reject(error);
          }
        });

        writer.on('error', (error) => {
          logger.error('サムネイルファイルの書き込みに失敗', error);
          reject(error);
        });
      });

    } catch (error) {
      logger.error('Twitchサムネイルの処理に失敗', error as Error);
      return false;
    }
  }

  /**
   * YouTube動画のサムネイル情報を取得
   */
  public async getThumbnailInfo(videoId: string): Promise<any> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        const thumbnails = video.snippet?.thumbnails;
        
        if (thumbnails) {
          logger.youtube(`動画 ${videoId} のサムネイル情報:`);
          if (thumbnails.default) logger.youtube(`  - デフォルト: ${thumbnails.default.url}`);
          if (thumbnails.medium) logger.youtube(`  - 中サイズ: ${thumbnails.medium.url}`);
          if (thumbnails.high) logger.youtube(`  - 高品質: ${thumbnails.high.url}`);
          if (thumbnails.standard) logger.youtube(`  - 標準: ${thumbnails.standard.url}`);
          if (thumbnails.maxres) logger.youtube(`  - 最高品質: ${thumbnails.maxres.url}`);
        }
        
        return thumbnails;
      }

      return null;
    } catch (error) {
      logger.error('サムネイル情報の取得に失敗', error as Error);
      return null;
    }
  }

  /**
   * 設定に基づいてサムネイルを自動処理
   */
  public async processThumbnailForBroadcast(broadcastId: string, twitchThumbnailUrl?: string): Promise<boolean> {
    try {
      const youtubeConfig = config.getYouTubeConfig();
      
      if (!youtubeConfig.autoUploadThumbnail) {
        logger.youtube('サムネイル自動アップロードが無効になっています');
        return false;
      }

      // カスタムサムネイルが設定されている場合はそれを優先
      if (youtubeConfig.customThumbnailPath) {
        logger.youtube('カスタムサムネイルをアップロード中...');
        return await this.uploadThumbnail(broadcastId, youtubeConfig.customThumbnailPath);
      }

      // Twitchサムネイルを使用
      if (twitchThumbnailUrl) {
        logger.youtube('Twitchサムネイルを自動アップロード中...');
        const enhancedUrl = this.getTwitchThumbnailUrl(twitchThumbnailUrl, youtubeConfig.thumbnailQuality);
        return await this.uploadTwitchThumbnailToYouTube(broadcastId, enhancedUrl);
      }

      logger.youtube('アップロード可能なサムネイルが見つかりませんでした');
      return false;

    } catch (error) {
      logger.error('サムネイル処理中にエラーが発生', error as Error);
      return false;
    }
  }

  /**
   * Twitchサムネイル品質を設定に基づいて調整
   */
  private getTwitchThumbnailUrl(originalUrl: string, quality: string): string {
    let width = '1920';
    let height = '1080';
    
    switch (quality) {
      case '720p':
        width = '1280';
        height = '720';
        break;
      case '480p':
        width = '854';
        height = '480';
        break;
      default: // 1080p
        width = '1920';
        height = '1080';
    }

    return originalUrl.replace('{width}', width).replace('{height}', height);
  }

  /**
   * サムネイルフォルダを作成
   */
  public createThumbnailDirectory(): void {
    const thumbnailDir = path.join(process.cwd(), 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
      logger.youtube('サムネイルフォルダを作成しました: thumbnails/');
    }
  }

  /**
   * サムネイル設定状況を表示
   */
  public displayThumbnailConfig(): void {
    const youtubeConfig = config.getYouTubeConfig();
    
    logger.youtube('📸 サムネイル設定:');
    logger.youtube(`  自動アップロード: ${youtubeConfig.autoUploadThumbnail ? '有効' : '無効'}`);
    logger.youtube(`  品質設定: ${youtubeConfig.thumbnailQuality}`);
    
    if (youtubeConfig.customThumbnailPath) {
      const exists = fs.existsSync(youtubeConfig.customThumbnailPath);
      logger.youtube(`  カスタムサムネイル: ${youtubeConfig.customThumbnailPath} ${exists ? '✅' : '❌'}`);
      if (!exists) {
        logger.warn('指定されたカスタムサムネイルファイルが見つかりません', '⚠️');
      }
    } else {
      logger.youtube('  カスタムサムネイル: 未設定（Twitchサムネイルを使用）');
    }
  }

  /**
   * Twitch配信情報に基づいてYouTubeタイトルを生成
   */
  public generateYouTubeTitle(twitchStream: any): string {
    const youtubeConfig = config.getYouTubeConfig();
    
    // カスタムタイトルが設定されている場合はそれを使用
    if (youtubeConfig.customTitle) {
      return this.processTitle(youtubeConfig.customTitle, twitchStream);
    }
    
    // 自動フォーマットを使用
    const template = youtubeConfig.autoTitleFormat;
    return this.processTitle(template, twitchStream);
  }

  /**
   * タイトルテンプレートを処理してプレースホルダーを置換
   */
  private processTitle(template: string, twitchStream: any): string {
    const youtubeConfig = config.getYouTubeConfig();
    let title = template;
    
    // プレースホルダーを置換
    title = title.replace(/{title}/g, twitchStream.title || 'Untitled Stream');
    title = title.replace(/{streamer}/g, twitchStream.user_name || 'Unknown Streamer');
    title = title.replace(/{game}/g, twitchStream.game_name || 'Unknown Game');
    title = title.replace(/{channel}/g, twitchStream.user_login || 'unknown');
    title = title.replace(/{viewers}/g, twitchStream.viewer_count?.toString() || '0');
    title = title.replace(/{language}/g, twitchStream.language || 'en');
    
    // 日付・時刻のプレースホルダー
    const now = new Date();
    title = title.replace(/{date}/g, now.toLocaleDateString('ja-JP'));
    title = title.replace(/{time}/g, now.toLocaleTimeString('ja-JP'));
    title = title.replace(/{datetime}/g, now.toLocaleString('ja-JP'));
    
    // 設定に基づく条件付き要素
    if (!youtubeConfig.includeStreamerName) {
      // ストリーマー名を削除するパターン
      title = title.replace(/\s*-\s*{streamer}/, '');
      title = title.replace(/{streamer}\s*-\s*/, '');
    }
    
    if (!youtubeConfig.includeTwitchTitle) {
      // タイトルを削除するパターン
      title = title.replace(/\s*-\s*{title}/, '');
      title = title.replace(/{title}\s*-\s*/, '');
    }
    
    if (!youtubeConfig.includeGameName) {
      // ゲーム名を削除するパターン
      title = title.replace(/\s*-\s*{game}/, '');
      title = title.replace(/{game}\s*-\s*/, '');
      title = title.replace(/\[{game}\]/, '');
      title = title.replace(/\({game}\)/, '');
    }
    
    // 連続するハイフンや空白を整理
    title = title.replace(/\s*-\s*-\s*/g, ' - ');
    title = title.replace(/\s+/g, ' ');
    title = title.trim();
    
    // YouTubeタイトルの最大長制限（100文字）
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    return title;
  }

  /**
   * タイトル設定状況を表示
   */
  public displayTitleConfig(): void {
    const youtubeConfig = config.getYouTubeConfig();
    
    logger.youtube('📝 タイトル設定:');
    
    if (youtubeConfig.customTitle) {
      logger.youtube(`  カスタムタイトル: "${youtubeConfig.customTitle}"`);
    } else {
      logger.youtube(`  自動フォーマット: "${youtubeConfig.autoTitleFormat}"`);
    }
    
    logger.youtube(`  配信者名を含む: ${youtubeConfig.includeStreamerName ? '有効' : '無効'}`);
    logger.youtube(`  Twitchタイトルを含む: ${youtubeConfig.includeTwitchTitle ? '有効' : '無効'}`);
    logger.youtube(`  ゲーム名を含む: ${youtubeConfig.includeGameName ? '有効' : '無効'}`);
  }

  /**
   * タイトルプレビューを生成（テスト用）
   */
  public previewTitle(twitchStream: any): void {
    const generatedTitle = this.generateYouTubeTitle(twitchStream);
    
    logger.youtube('📝 生成されるタイトルプレビュー:');
    logger.youtube(`  "${generatedTitle}"`);
    logger.youtube(`  文字数: ${generatedTitle.length}/100`);
    
    if (generatedTitle.length > 100) {
      logger.warn('タイトルが100文字を超えています。自動的に切り詰められます。', '⚠️');
    }
  }

  /**
   * 配信終了後のアーカイブ処理を実行
   */
  public async processArchiveAfterStreamEnd(broadcastId: string, twitchStream: any, startedAt: Date): Promise<boolean> {
    try {
      const archiveConfig = config.getArchiveConfig();
      
      if (!archiveConfig.enableProcessing) {
        logger.youtube('アーカイブ処理が無効になっています');
        return false;
      }

      logger.youtube('📼 配信終了後のアーカイブ処理を開始...');

      // アーカイブのプライバシー設定を更新
      const privacySuccess = await this.updateArchivePrivacy(broadcastId, archiveConfig.privacyStatus);
      if (!privacySuccess) {
        logger.warn('アーカイブのプライバシー設定更新に失敗しました', '⚠️');
      }

      // アーカイブタイトルの更新
      const newTitle = this.generateArchiveTitle(twitchStream, startedAt, archiveConfig.titleFormat);
      const titleSuccess = await this.updateVideoTitle(broadcastId, newTitle);
      if (!titleSuccess) {
        logger.warn('アーカイブタイトルの更新に失敗しました', '⚠️');
      }

      // アーカイブ説明文の更新
      const newDescription = this.generateArchiveDescription(twitchStream, startedAt, archiveConfig.descriptionTemplate);
      const descriptionSuccess = await this.updateVideoDescription(broadcastId, newDescription);
      if (!descriptionSuccess) {
        logger.warn('アーカイブ説明文の更新に失敗しました', '⚠️');
      }

      if (privacySuccess || titleSuccess || descriptionSuccess) {
        logger.success('アーカイブ処理が完了しました');
        return true;
      } else {
        logger.error('すべてのアーカイブ処理が失敗しました', new Error('Archive processing failed'));
        return false;
      }

    } catch (error) {
      logger.error('アーカイブ処理中にエラーが発生', error as Error);
      return false;
    }
  }

  /**
   * アーカイブタイトルを生成
   */
  private generateArchiveTitle(twitchStream: any, startedAt: Date, titleFormat: string): string {
    let title = titleFormat;
    
    // プレースホルダーの置換
    title = title.replace(/{originalTitle}/g, twitchStream.title || 'Untitled Stream');
    title = title.replace(/{streamer}/g, twitchStream.user_name || 'Unknown Streamer');
    title = title.replace(/{game}/g, twitchStream.game_name || 'Unknown Game');
    title = title.replace(/{channel}/g, twitchStream.user_login || 'unknown');
    
    // 日付関連
    const now = new Date();
    title = title.replace(/{date}/g, now.toLocaleDateString('ja-JP'));
    
    // 配信時間を計算
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000 / 60); // 分
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    title = title.replace(/{duration}/g, durationStr);
    
    return title.substring(0, 100); // YouTubeの文字数制限
  }

  /**
   * アーカイブ説明文を生成
   */
  private generateArchiveDescription(twitchStream: any, startedAt: Date, descriptionTemplate: string): string {
    let description = descriptionTemplate;
    
    // プレースホルダーの置換
    description = description.replace(/{originalTitle}/g, twitchStream.title || 'Untitled Stream');
    description = description.replace(/{streamer}/g, twitchStream.user_name || 'Unknown Streamer');
    description = description.replace(/{game}/g, twitchStream.game_name || 'Unknown Game');
    description = description.replace(/{channel}/g, twitchStream.user_login || 'unknown');
    
    // 日付関連
    const now = new Date();
    description = description.replace(/{date}/g, now.toLocaleDateString('ja-JP'));
    
    // 配信時間を計算
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000 / 60); // 分
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    description = description.replace(/{duration}/g, durationStr);
    
    return description;
  }

  /**
   * アーカイブ動画のプライバシー設定を更新
   */
  public async updateArchivePrivacy(videoId: string, privacyStatus: 'public' | 'unlisted' | 'private'): Promise<boolean> {
    try {
      logger.youtube(`アーカイブのプライバシー設定を更新中: ${privacyStatus}`);

      const response = await this.youtube.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: privacyStatus,
          },
        },
      });

      if (response.data.id) {
        logger.success(`アーカイブのプライバシー設定を ${privacyStatus} に更新しました`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('アーカイブプライバシー設定の更新に失敗', error as Error);
      return false;
    }
  }

  /**
   * アーカイブ動画のタイトルを更新
   */
  public async updateVideoTitle(videoId: string, title: string): Promise<boolean> {
    try {
      logger.youtube(`アーカイブタイトルを更新中: ${title}`);

      const response = await this.youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: title.substring(0, 100), // YouTubeの文字数制限
          },
        },
      });

      if (response.data.id) {
        logger.success('アーカイブタイトルを更新しました');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('アーカイブタイトルの更新に失敗', error as Error);
      return false;
    }
  }

  /**
   * アーカイブ動画の説明文を更新
   */
  public async updateVideoDescription(videoId: string, description: string): Promise<boolean> {
    try {
      logger.youtube('アーカイブ説明文を更新中...');

      const response = await this.youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            description: description.substring(0, 5000), // YouTubeの文字数制限
          },
        },
      });

      if (response.data.id) {
        logger.success('アーカイブ説明文を更新しました');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('アーカイブ説明文の更新に失敗', error as Error);
      return false;
    }
  }

  /**
   * ライブ配信のタイトルを更新（リアルタイム更新用）
   */
  public async updateLiveBroadcastTitle(broadcastId: string, newTitle: string): Promise<boolean> {
    try {
      logger.youtube(`ライブ配信タイトルを更新中: "${newTitle}"`);

      // まず現在の配信情報を取得
      const currentBroadcast = await this.youtube.liveBroadcasts.list({
        part: ['snippet'],
        id: [broadcastId],
      });

      if (!currentBroadcast.data.items || currentBroadcast.data.items.length === 0) {
        logger.error(`配信ID ${broadcastId} が見つかりません`);
        return false;
      }

      const broadcast = currentBroadcast.data.items[0];
      
      // タイトルを更新
      const response = await this.youtube.liveBroadcasts.update({
        part: ['snippet'],
        requestBody: {
          id: broadcastId,
          snippet: {
            ...broadcast.snippet,
            title: newTitle.substring(0, 100), // YouTubeの文字数制限
          },
        },
      });

      if (response.data.id) {
        logger.success(`ライブ配信タイトルを更新しました: "${newTitle}"`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('ライブ配信タイトルの更新に失敗', error as Error);
      return false;
    }
  }

  /**
   * Twitchタイトル変更を検出してYouTubeタイトルを自動更新
   */
  public async handleTwitchTitleChange(broadcastId: string, twitchStream: any, previousTitle?: string): Promise<boolean> {
    try {
      const currentTitle = twitchStream.title;
      
      // タイトルが変更されているかチェック
      if (previousTitle && currentTitle === previousTitle) {
        return false; // 変更なし
      }

      logger.info(`🔄 Twitchタイトル変更を検出: "${previousTitle}" → "${currentTitle}"`, '📝');
      
      // 新しいYouTubeタイトルを生成
      const newYouTubeTitle = this.generateYouTubeTitle(twitchStream);
      
      // YouTubeタイトルを更新
      const success = await this.updateLiveBroadcastTitle(broadcastId, newYouTubeTitle);
        if (success) {
        logger.success('YouTubeタイトルの自動更新が完了しました');
      }
      
      return success;
    } catch (error) {
      logger.error('タイトル変更処理中にエラーが発生', error as Error);
      return false;
    }
  }
}
