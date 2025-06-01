// node-media-server の型定義
declare module 'node-media-server' {
  interface NodeMediaServerConfig {
    rtmp?: {
      port?: number;
      chunk_size?: number;
      gop_cache?: boolean;
      ping?: number;
      ping_timeout?: number;
    };
    http?: {
      port?: number;
      allow_origin?: string;
      mediaroot?: string;
    };
    relay?: {
      ffmpeg?: string;
      tasks?: any[];
    };
    logType?: number;
  }

  class NodeMediaServer {
    constructor(config: NodeMediaServerConfig);
    run(): void;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }

  export default NodeMediaServer;
}

// fluent-ffmpeg の追加型定義
declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(source: string): FfmpegCommand;
    output(target: string): FfmpegCommand;
    run(): void;
    on(event: string, callback: (...args: any[]) => void): FfmpegCommand;
  }
  
  function ffmpeg(input?: string): FfmpegCommand;
  export default ffmpeg;
}
