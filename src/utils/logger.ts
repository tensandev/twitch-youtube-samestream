import chalk from 'chalk';
import { LogLevel } from '../types';
import { config } from './config';

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = config.getAppConfig().logLevel;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatTimestamp(): string {
    return new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private formatMessage(level: LogLevel, message: string, emoji?: string): string {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    const prefix = emoji || this.getLevelEmoji(level);
    const levelText = chalk.bold(this.getLevelColor(level)(`[${level.toUpperCase()}]`));
    return `${timestamp} ${prefix} ${levelText} ${message}`;
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      debug: '🔍',
      info: '✨',
      warn: '⚠️',
      error: '❌'
    };
    return emojis[level];
  }

  private getLevelColor(level: LogLevel) {
    const colors = {
      debug: chalk.cyan,
      info: chalk.green,
      warn: chalk.yellow,
      error: chalk.red
    };
    return colors[level];
  }

  public debug(message: string, emoji?: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, emoji));
    }
  }

  public info(message: string, emoji?: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, emoji));
    }
  }

  public warn(message: string, emoji?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, emoji));
    }
  }

  public error(message: string, error?: Error, emoji?: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, emoji));
      if (error && this.logLevel === 'debug') {
        console.error(chalk.red(error.stack));
      }
    }
  }

  // 特別なログメソッド
  public success(message: string): void {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    console.log(`${timestamp} 🎉 ${chalk.green.bold('[SUCCESS]')} ${message}`);
  }

  public streaming(message: string): void {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    console.log(`${timestamp} 🔴 ${chalk.magenta.bold('[STREAMING]')} ${message}`);
  }

  public twitch(message: string): void {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    console.log(`${timestamp} 💜 ${chalk.magenta.bold('[TWITCH]')} ${message}`);
  }

  public youtube(message: string): void {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    console.log(`${timestamp} ❤️ ${chalk.red.bold('[YOUTUBE]')} ${message}`);
  }

  public banner(title: string): void {
    const border = '='.repeat(60);
    console.log('\n' + chalk.cyan(border));
    console.log(chalk.cyan.bold(`🎮✨ ${title} ✨🎮`));
    console.log(chalk.cyan(border) + '\n');
  }

  // ログレベル変更
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`ログレベルを ${level} に変更しました`);
  }

  // 統計情報表示
  public stats(stats: { [key: string]: any }): void {
    const timestamp = chalk.gray(`[${this.formatTimestamp()}]`);
    console.log(`${timestamp} 📊 ${chalk.blue.bold('[STATS]')}`);
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${chalk.cyan(key)}: ${chalk.white(value)}`);
    });
  }
}

// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance();
