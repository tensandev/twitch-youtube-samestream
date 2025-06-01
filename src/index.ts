#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { TwitchService } from './services/TwitchService';
import { YouTubeService } from './services/YouTubeService';
import { StreamService } from './services/StreamService';
import { config as appConfig } from './utils/config';
import { logger } from './utils/logger';
import { config } from './utils/config';
import { StreamingStatus } from './types';

class TwitchYouTubeMirrorApp {
  private twitchService: TwitchService;
  private youtubeService: YouTubeService;
  private streamService: StreamService;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private currentStreamingStatus: StreamingStatus = { isStreaming: false };

  // isRunningの状態を外部から確認できるようにする
  public get running(): boolean {
    return this.isRunning;
  }constructor() {
    const twitchConfig = appConfig.getTwitchConfig();
    this.twitchService = new TwitchService(
      twitchConfig.clientId,
      twitchConfig.clientSecret,
      twitchConfig.accessToken
    );
    this.youtubeService = new YouTubeService();
    this.streamService = new StreamService();
    this.setupStreamServiceEvents();
  }

  private setupStreamServiceEvents(): void {
    this.streamService.on('mirrorStreamStart', (data) => {
      logger.streaming('🚀 ミラー配信が開始されました！');
      this.currentStreamingStatus.isStreaming = true;
      this.currentStreamingStatus.startedAt = new Date();
    });

    this.streamService.on('mirrorStreamEnd', (data) => {
      logger.info('ミラー配信が終了されました', '⏹️');
      this.currentStreamingStatus.isStreaming = false;
      this.currentStreamingStatus.startedAt = undefined;
    });

    this.streamService.on('mirrorStreamError', (error) => {
      logger.error('ミラー配信でエラーが発生しました', error);
      this.currentStreamingStatus.isStreaming = false;
      this.currentStreamingStatus.error = error.message;
    });
  }

  /**
   * アプリケーションを開始
   */
  public async start(channelName?: string): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('アプリケーションは既に実行中です', '⚠️');
        return;
      }

      logger.banner('Twitch to YouTube Mirror Stream');
      
      const targetChannel = channelName || config.getTwitchConfig().channelName;
      logger.info(`監視対象チャンネル: ${targetChannel}`, '👁️');
      
      // 認証チェック
      const spinner = ora('認証状態をチェック中...').start();
      
      const twitchAuth = await this.twitchService.validateToken();
      if (!twitchAuth) {
        spinner.fail('Twitch認証が無効です');
        process.exit(1);
      }
      
      spinner.text = 'YouTube認証をチェック中...';
      const youtubeAuth = await this.youtubeService.checkAuth();
      if (!youtubeAuth) {
        spinner.warn('YouTube認証が無効です（読み取り専用モード）');
      }        spinner.succeed('認証チェック完了');

      // サムネイル設定状況を表示
      this.youtubeService.displayThumbnailConfig();
      
      // タイトル設定状況を表示
      this.youtubeService.displayTitleConfig();
      
      // サムネイルフォルダを作成
      this.youtubeService.createThumbnailDirectory();

      // Media Serverを開始
      this.streamService.startMediaServer();

      // 監視開始
      this.isRunning = true;
      await this.startMonitoring(targetChannel);
      
    } catch (error) {
      logger.error('アプリケーションの開始に失敗', error as Error);
      process.exit(1);
    }
  }

  /**
   * 配信監視を開始
   */
  private async startMonitoring(channelName: string): Promise<void> {
    logger.info('🔍 配信監視を開始しました...', '🚀');
    
    const checkStream = async () => {
      try {
        const stream = await this.twitchService.getStreamStatus(channelName);
        
        if (stream && !this.currentStreamingStatus.isStreaming) {
          // 配信が開始された
          logger.streaming(`🔴 ${channelName} の配信を検出しました！`);
          await this.handleStreamStart(channelName, stream);
          
        } else if (!stream && this.currentStreamingStatus.isStreaming) {
          // 配信が終了された
          logger.info(`📴 ${channelName} の配信が終了しました`);
          await this.handleStreamEnd();
        }
        
      } catch (error) {
        logger.error('配信チェック中にエラーが発生', error as Error);
      }
    };

    // 初回チェック
    await checkStream();
      // 定期チェック開始
    const interval = config.getAppConfig().checkInterval;
    this.checkInterval = setInterval(checkStream, interval);
    
    logger.info(`⏰ ${interval / 1000}秒間隔で監視中...`);
    logger.info('Ctrl+C で安全に終了できます', '🛡️');
  }

  /**
   * 配信開始を処理
   */
  private async handleStreamStart(channelName: string, stream: any): Promise<void> {
    try {
      const spinner = ora('配信URLを取得中...').start();
      
      // プレイリストURLを取得
      const playlistUrl = await this.twitchService.getStreamPlaylistUrl(channelName);
      if (!playlistUrl) {
        spinner.fail('配信URLの取得に失敗');
        return;
      }
      
      spinner.text = '配信品質をテスト中...';
      const qualityTest = await this.streamService.testStreamQuality(playlistUrl);
      if (!qualityTest) {
        spinner.fail('配信品質テストに失敗');
        return;
      }
      
      spinner.succeed('配信準備完了');
        // YouTube Live配信を作成（認証されている場合）
      let youtubeStreamInfo = null;
      try {
        // 自動タイトル生成を使用
        const title = this.youtubeService.generateYouTubeTitle(stream);
        const description = `Twitchからの自動ミラー配信\n\n元配信: https://twitch.tv/${channelName}\n配信者: ${stream.user_name}\nゲーム: ${stream.game_name}`;
          const broadcastId = await this.youtubeService.createLiveBroadcast(title, description);
        if (broadcastId) {
          const streamInfo = await this.youtubeService.createLiveStream(title);
          if (streamInfo) {
            await this.youtubeService.bindStreamToBroadcast(broadcastId, streamInfo.streamId);
            youtubeStreamInfo = { broadcastId, ...streamInfo };            logger.youtube('YouTube Live配信を準備しました');
            
            // 設定に基づいてサムネイルを自動処理
            try {
              const thumbnailSuccess = await this.youtubeService.processThumbnailForBroadcast(
                broadcastId, 
                stream.thumbnail_url
              );
              if (thumbnailSuccess) {
                logger.success('サムネイルのアップロードが完了しました');
              }
            } catch (thumbnailError) {
              logger.warn('サムネイルアップロード中にエラーが発生しました', '⚠️');
            }
          }
        }
      } catch (error) {
        logger.warn('YouTube Live配信の作成をスキップしました（認証が必要）', '⚠️');
      }
      
      // ミラー配信開始
      const rtmpUrl = youtubeStreamInfo?.rtmpUrl || config.getYouTubeConfig().rtmpUrl;
      const streamKey = youtubeStreamInfo?.streamKey || config.getYouTubeConfig().streamKey;
        const success = await this.streamService.startMirrorStream(playlistUrl, rtmpUrl, streamKey);
        if (success) {        // YouTube Live配信を開始（FFmpegが安定してから）
        if (youtubeStreamInfo) {
          logger.info('FFmpegストリームが安定するまで15秒待機中...', '⏳');
          setTimeout(async () => {
            try {
              // 詳細診断を実行
              await this.youtubeService.diagnoseLiveStreamStatus(youtubeStreamInfo.broadcastId, youtubeStreamInfo.streamId);
              
              // ストリーム準備状態を確認
              logger.youtube('配信準備状態を確認中...');
              const isReady = await this.youtubeService.verifyStreamReadiness(youtubeStreamInfo.broadcastId, youtubeStreamInfo.streamId);
              
              if (!isReady) {
                logger.warn('配信準備が完了していません。さらに30秒待機します...', '⏳');
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                // 再度診断と確認
                await this.youtubeService.diagnoseLiveStreamStatus(youtubeStreamInfo.broadcastId, youtubeStreamInfo.streamId);
                const retryReady = await this.youtubeService.verifyStreamReadiness(youtubeStreamInfo.broadcastId, youtubeStreamInfo.streamId);
                if (!retryReady) {
                  logger.error('配信準備が完了しませんでした。手動で確認してください。', new Error('Stream not ready'));
                  return;
                }
              }
              
              logger.youtube('YouTube Live配信をLIVEステータスに移行中...');
              const transitionSuccess = await this.youtubeService.transitionBroadcast(youtubeStreamInfo.broadcastId, 'live');
              if (transitionSuccess) {
                logger.success('YouTube Live配信が正常に開始されました！');
                
                // 最終診断
                setTimeout(async () => {
                  await this.youtubeService.diagnoseLiveStreamStatus(youtubeStreamInfo.broadcastId, youtubeStreamInfo.streamId);
                }, 10000); // 10秒後に最終確認
              } else {
                logger.warn('YouTube Live配信の開始に失敗しました', '⚠️');
              }
            } catch (error) {
              logger.error('YouTube Live配信開始でエラーが発生', error as Error);
            }
          }, 15000); // 15秒後に配信開始（より安全）
        }
          this.currentStreamingStatus = {
          isStreaming: true,
          twitchStream: stream,
          youtubeBroadcastId: youtubeStreamInfo?.broadcastId,
          youtubeStreamId: youtubeStreamInfo?.streamId,
          startedAt: new Date(),
        };
        
        logger.success('🎉 ミラー配信が正常に開始されました！');
        this.displayStreamingInfo(stream);
      }
      
    } catch (error) {
      logger.error('配信開始処理でエラーが発生', error as Error);
    }
  }  /**
   * 配信終了を処理
   */
  private async handleStreamEnd(): Promise<void> {
    try {
      // YouTube Live配信を終了
      if (this.currentStreamingStatus.youtubeBroadcastId) {
        try {
          logger.youtube('YouTube Live配信を終了中...');
          const endSuccess = await this.youtubeService.transitionBroadcast(
            this.currentStreamingStatus.youtubeBroadcastId, 
            'complete'
          );
          if (endSuccess) {
            logger.success('YouTube Live配信が正常に終了されました');
            
            // アーカイブ処理を実行
            if (this.currentStreamingStatus.twitchStream && this.currentStreamingStatus.startedAt) {
              try {
                logger.youtube('配信終了後のアーカイブ処理を開始...');
                const archiveSuccess = await this.youtubeService.processArchiveAfterStreamEnd(
                  this.currentStreamingStatus.youtubeBroadcastId,
                  this.currentStreamingStatus.twitchStream,
                  this.currentStreamingStatus.startedAt
                );
                if (archiveSuccess) {
                  logger.success('アーカイブ処理が完了しました');
                } else {
                  logger.warn('アーカイブ処理に失敗しました', '⚠️');
                }
              } catch (archiveError) {
                logger.error('アーカイブ処理中にエラーが発生', archiveError as Error);
              }
            }
          } else {
            logger.warn('YouTube Live配信の終了に失敗しました', '⚠️');
          }
        } catch (error) {
          logger.error('YouTube Live配信終了中にエラーが発生', error as Error);
        }
      }
      
      // ミラー配信を停止
      const success = await this.streamService.stopMirrorStream();
      if (success) {
        logger.success('ミラー配信を正常に停止しました');
      }
      
      this.currentStreamingStatus = { isStreaming: false };
      
    } catch (error) {
      logger.error('配信終了処理でエラーが発生', error as Error);
    }
  }

  /**
   * 配信情報を表示
   */
  private displayStreamingInfo(stream: any): void {
    console.log('\n' + chalk.cyan('='.repeat(60)));
    console.log(chalk.cyan.bold('📺 配信情報'));
    console.log(chalk.cyan('='.repeat(60)));
    console.log(`${chalk.yellow('配信者:')} ${stream.user_name}`);
    console.log(`${chalk.yellow('タイトル:')} ${stream.title}`);
    console.log(`${chalk.yellow('ゲーム:')} ${stream.game_name}`);
    console.log(`${chalk.yellow('視聴者数:')} ${stream.viewer_count.toLocaleString()}人`);
    console.log(`${chalk.yellow('言語:')} ${stream.language}`);
    console.log(`${chalk.yellow('開始時刻:')} ${new Date(stream.started_at).toLocaleString('ja-JP')}`);
    console.log(`${chalk.yellow('元URL:')} https://twitch.tv/${stream.user_login}`);
    console.log(chalk.cyan('='.repeat(60)) + '\n');
  }

  /**
   * 現在の状態を表示
   */
  public displayStatus(): void {
    logger.banner('配信状態');
    
    if (this.currentStreamingStatus.isStreaming) {
      logger.streaming('🔴 配信中');
      if (this.currentStreamingStatus.twitchStream) {
        this.displayStreamingInfo(this.currentStreamingStatus.twitchStream);
      }
      if (this.currentStreamingStatus.startedAt) {
        const duration = Date.now() - this.currentStreamingStatus.startedAt.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        logger.info(`配信時間: ${hours}時間${minutes}分`, '⏱️');
      }
    } else {
      logger.info('📴 オフライン');
    }
  }  /**
   * アプリケーションを停止
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('アプリケーションは実行されていません', '⚠️');
      return;
    }

    logger.info('アプリケーションを停止中...', '⏹️');
    
    this.isRunning = false;
    
    // 監視タイマーを停止
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('配信監視を停止しました', '👁️');
    }
    
    // アクティブな配信がある場合の停止処理
    if (this.currentStreamingStatus.isStreaming) {
      logger.info('アクティブな配信を停止中...', '🛑');
        // YouTube Live配信を終了
      if (this.currentStreamingStatus.youtubeBroadcastId) {
        try {
          logger.youtube('YouTube Live配信を終了中...');
          const endSuccess = await this.youtubeService.transitionBroadcast(
            this.currentStreamingStatus.youtubeBroadcastId, 
            'complete'
          );
          if (endSuccess) {
            logger.success('YouTube Live配信が正常に終了されました');
            
            // アーカイブ処理を実行
            if (this.currentStreamingStatus.twitchStream && this.currentStreamingStatus.startedAt) {
              try {
                logger.youtube('配信終了後のアーカイブ処理を開始...');
                const archiveSuccess = await this.youtubeService.processArchiveAfterStreamEnd(
                  this.currentStreamingStatus.youtubeBroadcastId,
                  this.currentStreamingStatus.twitchStream,
                  this.currentStreamingStatus.startedAt
                );
                if (archiveSuccess) {
                  logger.success('アーカイブ処理が完了しました');
                } else {
                  logger.warn('アーカイブ処理に失敗しました', '⚠️');
                }
              } catch (archiveError) {
                logger.error('アーカイブ処理中にエラーが発生', archiveError as Error);
              }
            }
          } else {
            logger.warn('YouTube Live配信の終了に失敗しました', '⚠️');
          }
        } catch (error) {
          logger.error('YouTube Live配信終了中にエラーが発生', error as Error);
        }
      }
      
      // ミラー配信を停止
      try {
        logger.info('ミラー配信を停止中...', '📡');
        await this.streamService.stopMirrorStream();
        logger.success('ミラー配信が停止されました');
      } catch (error) {
        logger.error('ミラー配信停止中にエラーが発生', error as Error);
      }
    }
    
    // リソースクリーンアップ
    try {
      logger.info('リソースをクリーンアップ中...', '🧹');
      this.streamService.cleanup();
      logger.success('リソースクリーンアップが完了しました');
    } catch (error) {
      logger.error('クリーンアップ中にエラーが発生', error as Error);
    }
    
    // 状態をリセット
    this.currentStreamingStatus = { isStreaming: false };
    
    logger.success('👋 アプリケーションが正常に停止されました');
    process.exit(0);
  }

  /**
   * 手動で配信をテスト
   */
  public async testStream(channelName: string): Promise<void> {
    logger.banner('配信テスト');
    
    const spinner = ora(`${channelName} の配信状況をチェック中...`).start();
    
    try {
      const stream = await this.twitchService.getStreamStatus(channelName);
      
      if (!stream) {
        spinner.fail(`${channelName} は現在オフラインです`);
        return;
      }
      
      spinner.text = 'プレイリストURLを取得中...';
      const playlistUrl = await this.twitchService.getStreamPlaylistUrl(channelName);
      
      if (!playlistUrl) {
        spinner.fail('プレイリストURLの取得に失敗');
        return;
      }
      
      spinner.text = '配信品質をテスト中...';
      const qualityTest = await this.streamService.testStreamQuality(playlistUrl);
      
      if (qualityTest) {
        spinner.succeed('配信テスト成功！');
        this.displayStreamingInfo(stream);
        
        // 品質オプションを表示
        const qualities = await this.twitchService.getStreamQualities(playlistUrl);
        if (qualities.length > 0) {
          logger.info(`${qualities.length}個の品質オプションが利用可能です`, '📊');
        }
      } else {
        spinner.fail('配信テスト失敗');
      }
      
    } catch (error) {
      spinner.fail('配信テストでエラーが発生');
      logger.error('配信テストエラー', error as Error);
    }
  }
}

// CLIコマンド設定
const program = new Command();
const app = new TwitchYouTubeMirrorApp();

program
  .name('twitch-youtube-mirror')
  .description('🎮✨ Twitch to YouTube mirror streaming CLI tool')
  .version('1.0.0');

program
  .command('start')
  .description('配信監視を開始')
  .option('-c, --channel <channel>', 'Twitchチャンネル名')
  .action(async (options) => {
    await app.start(options.channel);
  });

program
  .command('stop')
  .description('アプリケーションを停止')
  .action(async () => {
    await app.stop();
  });

program
  .command('status')
  .description('現在の配信状態を表示')
  .action(() => {
    app.displayStatus();
  });

program
  .command('test')
  .description('指定チャンネルの配信をテスト')
  .argument('<channel>', 'Twitchチャンネル名')
  .action(async (channel) => {
    await app.testStream(channel);
  });

program
  .command('config')
  .description('設定情報を表示')
  .action(() => {
    logger.banner('設定情報');
    const configInfo = config.getConfigForDebug();
    console.log(JSON.stringify(configInfo, null, 2));
  });

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否', new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  logger.error('未捕捉例外', error);
  process.exit(1);
});

// グローバルなCtrl+C終了処理
process.on('SIGINT', async () => {
  logger.info('終了シグナル(Ctrl+C)を受信しました...', '⏹️');
  try {
    if (app && app.running) {
      await app.stop();
    } else {
      logger.info('アプリケーションを強制終了します...', '⚡');
      process.exit(0);
    }
  } catch (error) {
    logger.error('終了処理中にエラーが発生しました', error as Error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('終了シグナル(SIGTERM)を受信しました...', '⏹️');
  try {
    if (app && app.running) {
      await app.stop();
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('終了処理中にエラーが発生しました', error as Error);
    process.exit(1);
  }
});

// CLIを実行
if (require.main === module) {
  program.parse();
}

export default TwitchYouTubeMirrorApp;
