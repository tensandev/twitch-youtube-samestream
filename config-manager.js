#!/usr/bin/env node

const { YouTubeService } = require('./dist/services/YouTubeService');
const { Config } = require('./dist/utils/config');

async function configManager() {
    console.log('⚙️ YouTube設定管理ツール v1.0\n');
    
    try {
        // 設定を読み込み
        const configInstance = Config.getInstance();
        const config = configInstance.getConfig();
        
        // YouTubeServiceのインスタンスを作成
        const youtubeService = new YouTubeService(config);
        
        console.log('📋 現在の設定状況:\n');
        
        // タイトル設定の詳細表示
        console.log('🎯 タイトル設定:');
        console.log('────────────────────────────────────────');
        if (config.customTitle) {
            console.log(`✅ カスタムタイトル: "${config.customTitle}"`);
            console.log('   ※ カスタムタイトルが設定されているため、自動生成は使用されません');
        } else {
            console.log('❌ カスタムタイトル: 未設定');
            console.log('✅ 自動生成を使用します');
        }
        
        const format = config.autoTitleFormat || '{streamer}の{game}配信 - {title} ({date})';
        console.log(`📝 自動フォーマット: "${format}"`);
        console.log(`📅 配信者名含む: ${config.includeStreamerName !== false ? '✅ 有効' : '❌ 無効'}`);
        console.log(`📺 Twitchタイトル含む: ${config.includeTwitchTitle !== false ? '✅ 有効' : '❌ 無効'}`);
        console.log(`🎮 ゲーム名含む: ${config.includeGameName !== false ? '✅ 有効' : '❌ 無効'}\n`);
        
        // サムネイル設定の詳細表示
        console.log('🖼️ サムネイル設定:');
        console.log('────────────────────────────────────────');
        console.log(`🔄 自動アップロード: ${config.autoUploadThumbnail !== false ? '✅ 有効' : '❌ 無効'}`);
        console.log(`📏 品質設定: ${config.thumbnailQuality || '1080p'}`);
        
        if (config.customThumbnailPath) {
            console.log(`📁 カスタムサムネイル: ${config.customThumbnailPath}`);
            // カスタムサムネイルファイルの存在確認
            const fs = require('fs');
            if (fs.existsSync(config.customThumbnailPath)) {
                console.log('   ✅ ファイルが存在します');
            } else {
                console.log('   ❌ ファイルが見つかりません');
            }
        } else {
            console.log('📁 カスタムサムネイル: 未設定（Twitchサムネイルを使用）');
        }
        
        console.log('\n🎨 使用可能なプレースホルダー:');
        console.log('────────────────────────────────────────');
        console.log('{title}     - Twitchの配信タイトル');
        console.log('{streamer}  - 配信者名');
        console.log('{game}      - ゲーム名');
        console.log('{channel}   - チャンネル名');
        console.log('{viewers}   - 視聴者数');
        console.log('{language}  - 言語');
        console.log('{date}      - 日付 (YYYY/M/D)');
        console.log('{time}      - 時刻 (HH:MM:SS)');
        console.log('{datetime}  - 日時 (YYYY/M/D HH:MM:SS)');
        
        console.log('\n🧪 タイトル生成プレビュー:');
        console.log('────────────────────────────────────────');
        
        // 様々なシナリオでのプレビュー
        const testScenarios = [
            {
                name: '現在の配信（tensandev）',
                data: {
                    title: '同時配信テスト',
                    user_name: 'tensandev',
                    game_name: 'VALORANT',
                    viewer_count: 1,
                    language: 'ja'
                }
            },
            {
                name: 'ゲーム配信例',
                data: {
                    title: '【APEX LEGENDS】ランク戦で頂点を目指す！',
                    user_name: 'tensandev',
                    game_name: 'Apex Legends',
                    viewer_count: 567,
                    language: 'ja'
                }
            },
            {
                name: '雑談配信例',
                data: {
                    title: '今日の出来事と質問コーナー',
                    user_name: 'tensandev',
                    game_name: 'Just Chatting',
                    viewer_count: 234,
                    language: 'ja'
                }
            }
        ];
        
        for (const scenario of testScenarios) {
            console.log(`\n📺 ${scenario.name}:`);
            const generatedTitle = youtubeService.generateYouTubeTitle(scenario.data);
            console.log(`   入力: "${scenario.data.title}" (${scenario.data.game_name})`);
            console.log(`   出力: "${generatedTitle}"`);
            console.log(`   文字数: ${generatedTitle.length}/100`);
            
            if (generatedTitle.length > 100) {
                console.log('   ⚠️  警告: YouTubeの文字数制限(100文字)を超えています');
            }
        }
        
        console.log('\n📋 サムネイル情報:');
        console.log('────────────────────────────────────────');
        const sampleThumbnailUrl = youtubeService.getTwitchThumbnailUrl('tensandev', config.thumbnailQuality || '1080p');
        console.log(`サンプルURL: ${sampleThumbnailUrl}`);
        
        console.log('\n💡 設定変更方法:');
        console.log('────────────────────────────────────────');
        console.log('.envファイルを編集して以下の変数を設定してください:');
        console.log('');
        console.log('# タイトル設定');
        console.log('CUSTOM_YOUTUBE_TITLE=カスタムタイトル');
        console.log('AUTO_TITLE_FORMAT=[ミラー配信] {title} - {streamer}');
        console.log('INCLUDE_STREAMER_NAME=true');
        console.log('INCLUDE_TWITCH_TITLE=true');
        console.log('INCLUDE_GAME_NAME=true');
        console.log('');
        console.log('# サムネイル設定');
        console.log('AUTO_UPLOAD_THUMBNAIL=true');
        console.log('CUSTOM_THUMBNAIL_PATH=./thumbnails/my_thumbnail.jpg');
        console.log('THUMBNAIL_QUALITY=1080p  # 720p, 480p も選択可能');
        
        console.log('\n✅ 設定確認が完了しました。');
        
    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
        console.error(error.stack);
    }
}

// 引数の処理
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('YouTube設定管理ツール');
    console.log('');
    console.log('使用方法:');
    console.log('  node config-manager.js        設定の詳細表示');
    console.log('  node config-manager.js --help  このヘルプを表示');
    console.log('');
} else {
    configManager();
}
