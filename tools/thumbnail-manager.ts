#!/usr/bin/env node

/**
 * YouTube サムネイル管理ツール
 * カスタムサムネイルの設定、アップロード、管理を行います
 */

import { YouTubeService } from '../src/services/YouTubeService';
import { logger } from '../src/utils/logger';
import { config } from '../src/utils/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';

class ThumbnailManager {
  private youtubeService: YouTubeService;
  private rl: readline.Interface;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async start(): Promise<void> {
    console.log(chalk.blue('🎨✨ YouTube サムネイル管理ツール ✨🎨'));
    console.log(chalk.gray('════════════════════════════════════════════════════════════════'));

    try {
      // 認証チェック
      const authValid = await this.youtubeService.checkAuth();
      if (!authValid) {
        console.log(chalk.red('❌ YouTube認証が無効です。先にOAuth認証を完了してください。'));
        process.exit(1);
      }

      console.log(chalk.green('✅ YouTube認証確認済み'));
      
      // 現在の設定を表示
      this.displayCurrentConfig();

      // メインメニュー
      await this.showMainMenu();

    } catch (error) {
      logger.error('サムネイル管理ツールでエラーが発生', error as Error);
    } finally {
      this.rl.close();
    }
  }

  private displayCurrentConfig(): void {
    const youtubeConfig = config.getYouTubeConfig();
    
    console.log('\n' + chalk.cyan('📋 現在のサムネイル設定:'));
    console.log(`   自動アップロード: ${youtubeConfig.autoUploadThumbnail ? chalk.green('有効') : chalk.red('無効')}`);
    console.log(`   品質設定: ${chalk.yellow(youtubeConfig.thumbnailQuality)}`);
    
    if (youtubeConfig.customThumbnailPath) {
      const exists = fs.existsSync(youtubeConfig.customThumbnailPath);
      console.log(`   カスタムサムネイル: ${chalk.white(youtubeConfig.customThumbnailPath)} ${exists ? chalk.green('✅') : chalk.red('❌')}`);
    } else {
      console.log(`   カスタムサムネイル: ${chalk.gray('未設定（Twitchサムネイルを使用）')}`);
    }
  }

  private async showMainMenu(): Promise<void> {
    console.log('\n' + chalk.cyan('🎯 メニュー:'));
    console.log('1. カスタムサムネイルをアップロード');
    console.log('2. サムネイル設定を表示');
    console.log('3. サムネイルフォルダを開く');
    console.log('4. 動画のサムネイル情報を取得');
    console.log('5. 終了');

    const choice = await this.prompt('\n選択してください (1-5): ');

    switch (choice.trim()) {
      case '1':
        await this.uploadCustomThumbnail();
        break;
      case '2':
        this.youtubeService.displayThumbnailConfig();
        break;
      case '3':
        await this.openThumbnailFolder();
        break;
      case '4':
        await this.getThumbnailInfo();
        break;
      case '5':
        console.log(chalk.green('👋 ツールを終了します'));
        return;
      default:
        console.log(chalk.red('無効な選択です'));
        await this.showMainMenu();
    }

    // メニューに戻る
    await this.showMainMenu();
  }

  private async uploadCustomThumbnail(): Promise<void> {
    console.log('\n' + chalk.cyan('📤 カスタムサムネイルアップロード'));
    
    const videoId = await this.prompt('YouTube動画ID（またはBroadcast ID）を入力: ');
    if (!videoId.trim()) {
      console.log(chalk.red('動画IDが入力されていません'));
      return;
    }

    const thumbnailPath = await this.prompt('サムネイル画像のパス（.jpg/.png）を入力: ');
    if (!thumbnailPath.trim()) {
      console.log(chalk.red('サムネイルパスが入力されていません'));
      return;
    }

    if (!fs.existsSync(thumbnailPath)) {
      console.log(chalk.red('指定されたファイルが見つかりません'));
      return;
    }

    console.log(chalk.yellow('📤 アップロード中...'));
    const success = await this.youtubeService.uploadThumbnail(videoId, thumbnailPath);
    
    if (success) {
      console.log(chalk.green('✅ サムネイルのアップロードが完了しました！'));
    } else {
      console.log(chalk.red('❌ サムネイルのアップロードに失敗しました'));
    }
  }

  private async openThumbnailFolder(): Promise<void> {
    const thumbnailDir = path.join(process.cwd(), 'thumbnails');
    
    if (!fs.existsSync(thumbnailDir)) {
      console.log(chalk.yellow('📁 サムネイルフォルダを作成します...'));
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    console.log(chalk.green(`📁 サムネイルフォルダ: ${thumbnailDir}`));
    console.log(chalk.gray('このフォルダにサムネイル画像を保存してください（JPG/PNG形式）'));
    
    // ファイル一覧を表示
    const files = fs.readdirSync(thumbnailDir).filter(file => 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') || 
      file.toLowerCase().endsWith('.png')
    );
    
    if (files.length > 0) {
      console.log('\n' + chalk.cyan('📷 見つかったサムネイル:'));
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    } else {
      console.log(chalk.gray('\n📷 サムネイル画像が見つかりませんでした'));
    }
  }

  private async getThumbnailInfo(): Promise<void> {
    console.log('\n' + chalk.cyan('📋 サムネイル情報取得'));
    
    const videoId = await this.prompt('YouTube動画IDを入力: ');
    if (!videoId.trim()) {
      console.log(chalk.red('動画IDが入力されていません'));
      return;
    }

    console.log(chalk.yellow('📋 情報取得中...'));
    const info = await this.youtubeService.getThumbnailInfo(videoId);
    
    if (info) {
      console.log(chalk.green('✅ サムネイル情報を取得しました'));
    } else {
      console.log(chalk.red('❌ サムネイル情報の取得に失敗しました'));
    }
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  const manager = new ThumbnailManager();
  manager.start().catch(error => {
    logger.error('サムネイル管理ツールでエラーが発生', error);
    process.exit(1);
  });
}

export { ThumbnailManager };
