import NodeMediaServer from 'node-media-server';
import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { RTMPStreamConfig, StreamingStatus } from '../types';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export class StreamService extends EventEmitter {
  private mediaServer: NodeMediaServer | null = null;
  private ffmpegProcess: ChildProcess | null = null;
  private isStreaming: boolean = false;
  private streamingStatus: StreamingStatus = { isStreaming: false };
  private youtubeConfig = config.getYouTubeConfig();
  private retryCount = 0;
  private maxRetries = config.getAppConfig().retryCount;

  constructor() {
    super();
    this.setupMediaServer();
  }

  private setupMediaServer(): void {
    // Node Media Serverの設定
    const mediaServerConfig = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8000,
        allow_origin: '*',
        mediaroot: './media',
      },
      relay: {
        ffmpeg: this.getFFmpegPath(),
        tasks: [] as any[],
      },
      logType: 0, // ログを無効化
    };

    this.mediaServer = new NodeMediaServer(mediaServerConfig);
    this.setupMediaServerEvents();
  }

  private setupMediaServerEvents(): void {
    if (!this.mediaServer) return;

    this.mediaServer.on('preConnect', (id: string, args: any) => {
      logger.debug(`RTMP接続開始: ${id}`, '🔗');
    });

    this.mediaServer.on('postConnect', (id: string, args: any) => {
      logger.info(`RTMP接続完了: ${id}`, '✅');
    });

    this.mediaServer.on('doneConnect', (id: string, args: any) => {
      logger.debug(`RTMP接続終了: ${id}`, '❌');
    });

    this.mediaServer.on('prePublish', (id: string, StreamPath: string, args: any) => {
      logger.streaming(`配信開始: ${StreamPath}`);
      this.emit('streamStart', { id, StreamPath, args });
    });

    this.mediaServer.on('postPublish', (id: string, StreamPath: string, args: any) => {
      logger.streaming(`配信中: ${StreamPath}`);
    });

    this.mediaServer.on('donePublish', (id: string, StreamPath: string, args: any) => {
      logger.info(`配信終了: ${StreamPath}`, '⏹️');
      this.emit('streamEnd', { id, StreamPath, args });
    });
  }

  private getFFmpegPath(): string {
    // システムのFFmpegパスを検出
    // 注意: システムにFFmpegがインストールされている必要があります
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  /**
   * Twitchからのストリームを取得してYouTubeに転送
   */
  public async startMirrorStream(twitchPlaylistUrl: string, youtubeRtmpUrl?: string, youtubeStreamKey?: string): Promise<boolean> {
    try {
      if (this.isStreaming) {
        logger.warn('既に配信中です', '⚠️');
        return false;
      }      const rtmpUrl = youtubeRtmpUrl || this.youtubeConfig.rtmpUrl;
      const streamKey = youtubeStreamKey || this.youtubeConfig.streamKey;
      
      // Stream Keyが設定されているかチェック
      if (!streamKey || streamKey.trim() === '') {
        logger.error('YouTube Stream Keyが設定されていません');
        return false;
      }
      
      // RTMP URLとStream Keyを正しく連結（末尾の/を考慮）
      const outputUrl = rtmpUrl.endsWith('/') ? `${rtmpUrl}${streamKey}` : `${rtmpUrl}/${streamKey}`;      logger.streaming('🚀 ミラー配信を開始します...');
      logger.info(`入力: ${twitchPlaylistUrl.substring(0, 50)}...`);
      logger.info(`出力: ${outputUrl.substring(0, 60)}...${streamKey.substring(streamKey.length - 8)}`);

      // FFmpegを使用してストリームを転送
      const ffmpegArgs = this.buildFFmpegArgs(twitchPlaylistUrl, outputUrl);
      
      this.ffmpegProcess = spawn(this.getFFmpegPath(), ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.setupFFmpegEventHandlers();
      
      this.isStreaming = true;
      this.streamingStatus = {
        isStreaming: true,
        startedAt: new Date(),
      };

      this.emit('mirrorStreamStart', { twitchUrl: twitchPlaylistUrl, youtubeUrl: outputUrl });
      
      logger.success('🔴 ミラー配信が開始されました！');
      return true;
    } catch (error) {
      logger.error('ミラー配信の開始に失敗', error as Error);
      return false;
    }
  }

  private buildFFmpegArgs(inputUrl: string, outputUrl: string): string[] {
    return [
      // 入力設定
      '-i', inputUrl,
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      
      // ビデオ設定
      '-c:v', 'copy', // 再エンコードせずにコピー
      
      // オーディオ設定
      '-c:a', 'copy', // 再エンコードせずにコピー
      
      // 出力設定
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      '-avoid_negative_ts', 'make_zero',
      
      // YouTube Live用の設定
      // コピーモードでは不要になる場合があるため、状況に応じて調整
      // '-bsf:v', 'h264_mp4toannexb', 
      // '-flags', '+global_header',
      
      // 出力URL
      outputUrl,
    ];
  }
  private setupFFmpegEventHandlers(): void {
    if (!this.ffmpegProcess) return;

    this.ffmpegProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        logger.debug(`FFmpeg stdout: ${output}`);
      }
    });    this.ffmpegProcess.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      
      // FFmpegの正常な統計情報をパース（これはエラーではない）
      if (output.includes('frame=') && output.includes('fps=') && output.includes('bitrate=')) {
        this.parseFFmpegOutput(output);
        return; // 正常な統計情報なのでエラーチェックを完全にスキップ
      }
      
      // FFmpegの進行状況や設定情報（エラーではない）
      if (output.includes('Stream mapping:') || 
          output.includes('Input #0') || 
          output.includes('Output #0') || 
          output.includes('encoder') || 
          output.includes('Stream #0:') ||
          output.includes('Press [q] to stop') ||
          output.includes('built with') ||
          output.includes('configuration:') ||
          output.includes('Duration:') ||
          output.includes('Metadata:')) {
        logger.debug(`FFmpeg Info: ${output.substring(0, 100)}...`);
        return; // 情報ログなのでエラーチェックをスキップ
      }
      
      // 実際のエラーのみをチェック（大文字小文字を区別して厳密にチェック）
      if (output.includes('Connection refused') || output.includes('Connection timed out')) {
        logger.error('RTMP接続エラー: YouTubeサーバーに接続できません', new Error(output));
        this.handleStreamError('connection_refused', output);
      } else if (output.includes('401 Unauthorized') || output.includes('Authentication failed')) {
        logger.error('RTMP認証エラー: Stream Keyが無効です', new Error(output));
        this.handleStreamError('unauthorized', output);
      } else if (output.includes('403 Forbidden') || output.includes('Publishing denied')) {
        logger.error('RTMP権限エラー: YouTube Live配信の準備ができていません', new Error(output));
        this.handleStreamError('forbidden', output);
      } else if (output.includes('RTMP_SendPacket') && output.includes('failed')) {
        logger.error('RTMP送信エラー: ストリーム配信に失敗しました', new Error(output));
        this.handleStreamError('rtmp_send_failed', output);
      } else if ((output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) && 
                 !output.includes('frame=') && 
                 !output.includes('speed=') &&
                 !output.includes('time=') &&
                 output.length > 10) {
        // 明確なエラーメッセージのみログ出力（統計情報は完全に除外）
        logger.debug(`FFmpeg警告: ${output}`, '⚠️');
      }
    });

    this.ffmpegProcess.on('close', (code) => {
      logger.info(`FFmpegプロセスが終了しました (コード: ${code})`, '🏁');
      this.isStreaming = false;
      this.streamingStatus.isStreaming = false;
      
      if (code !== 0 && this.retryCount < this.maxRetries) {
        logger.warn(`配信が予期せず終了しました。再試行します... (${this.retryCount + 1}/${this.maxRetries})`, '🔄');
        this.retryCount++;
        setTimeout(() => this.retryStream(), 5000);
      } else {
        this.emit('mirrorStreamEnd', { code, retries: this.retryCount });
      }
    });

    this.ffmpegProcess.on('error', (error) => {
      logger.error('FFmpegプロセスエラー', error);
      this.isStreaming = false;
      this.streamingStatus.isStreaming = false;
      this.emit('mirrorStreamError', error);
    });
  }
  private parseFFmpegOutput(output: string): void {
    try {
      // フレーム数、fps、ビットレートなどの情報を抽出
      const frameMatch = output.match(/frame=\s*(\d+)/);
      const fpsMatch = output.match(/fps=\s*([\d.]+)/);
      const bitrateMatch = output.match(/bitrate=\s*([\d.]+\w+)/);
      const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}.\d{2})/);

      if (frameMatch && fpsMatch && bitrateMatch) {
        const stats = {
          frame: frameMatch[1],
          fps: fpsMatch[1],
          bitrate: bitrateMatch[1],
          time: timeMatch ? timeMatch[1] : 'N/A',
        };

        // 統計情報を定期的に出力（10秒間隔）
        if (parseInt(frameMatch[1]) % 300 === 0) {
          logger.stats(stats);
        }
        
        // FFmpegが正常に動作していることをログに記録
        if (parseInt(frameMatch[1]) === 100) {
          logger.success('🎥 FFmpegストリーミングが正常に開始されました');
        }
      }
    } catch (error) {
      // パースエラーは無視
    }
  }

  private async retryStream(): Promise<void> {
    // 再試行ロジックは必要に応じて実装
    logger.info('ストリーム再試行機能は未実装です', '🔄');
  }

  /**
   * ミラー配信を停止
   */
  public async stopMirrorStream(): Promise<boolean> {
    try {
      if (!this.isStreaming || !this.ffmpegProcess) {
        logger.warn('配信中ではありません', '⚠️');
        return false;
      }

      logger.info('ミラー配信を停止中...', '⏹️');

      // FFmpegプロセスを終了
      this.ffmpegProcess.kill('SIGTERM');
      
      // 5秒後に強制終了
      setTimeout(() => {
        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
          logger.warn('FFmpegプロセスを強制終了します', '💥');
          this.ffmpegProcess.kill('SIGKILL');
        }
      }, 5000);

      this.isStreaming = false;
      this.streamingStatus.isStreaming = false;
      this.retryCount = 0;

      logger.success('ミラー配信が停止されました');
      this.emit('mirrorStreamStopped');
      
      return true;
    } catch (error) {
      logger.error('ミラー配信の停止に失敗', error as Error);
      return false;
    }
  }

  /**
   * Media Serverを開始
   */
  public startMediaServer(): void {
    if (!this.mediaServer) {
      logger.error('Media Serverが初期化されていません', undefined, '❌');
      return;
    }

    try {
      this.mediaServer.run();
      logger.success('Node Media Serverが開始されました');
      logger.info('RTMP: rtmp://localhost:1935');
      logger.info('HTTP: http://localhost:8000');
    } catch (error) {
      logger.error('Media Serverの開始に失敗', error as Error);
    }
  }

  /**
   * Media Serverを停止
   */
  public stopMediaServer(): void {
    if (this.mediaServer) {
      try {
        this.mediaServer.stop();
        logger.info('Node Media Serverが停止されました', '⏹️');
      } catch (error) {
        logger.error('Media Serverの停止に失敗', error as Error);
      }
    }
  }

  /**
   * ストリーミング状態を取得
   */
  public getStreamingStatus(): StreamingStatus {
    return { ...this.streamingStatus };
  }

  /**
   * 配信品質をテスト
   */
  public async testStreamQuality(playlistUrl: string): Promise<boolean> {
    try {
      logger.debug('配信品質をテスト中...', '🧪');
      
      const response = await axios.get(playlistUrl, { timeout: 10000 });
      
      if (response.status === 200 && response.data.includes('#EXTM3U')) {
        logger.success('配信品質テスト成功');
        return true;
      }
      
      logger.warn('配信品質テスト失敗: 無効なプレイリスト', '🧪❌');
      return false;
    } catch (error) {
      logger.error('配信品質テストに失敗', error as Error);
      return false;
    }
  }

  /**
   * リソースをクリーンアップ
   */
  public cleanup(): void {
    logger.info('StreamServiceをクリーンアップ中...', '🧹');
    
    this.stopMirrorStream();
    this.stopMediaServer();
    
    if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
      this.ffmpegProcess.kill('SIGKILL');
    }
    
    this.removeAllListeners();
    logger.info('StreamServiceのクリーンアップが完了しました', '✨');
  }

  /**
   * ストリームエラーを処理
   */
  private handleStreamError(errorType: string, details: string): void {
    logger.error(`ストリームエラーが発生: ${errorType}`, new Error(details));
    
    switch (errorType) {
      case 'forbidden':
        logger.warn('YouTube Live配信の準備状態を確認してください', '📺');
        logger.info('可能な原因: 配信がまだライブ状態ではない、ストリームキーが無効、チャンネルにライブ配信権限がない', 'ℹ️');
        break;
      case 'unauthorized':
        logger.warn('Stream Keyを確認してください', '🔑');
        break;
      case 'connection_refused':
        logger.warn('ネットワーク接続またはRTMP URLを確認してください', '🌐');
        break;
      case 'rtmp_send_failed':
        logger.warn('RTMP送信が失敗しました。配信を再開してください', '📡');
        break;
    }
    
    this.emit('streamError', { type: errorType, details });
  }
}
