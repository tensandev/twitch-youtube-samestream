// アーカイブ処理機能のテストスクリプト
// このスクリプトでアーカイブ処理の動作を検証できます

const { YouTubeService } = require('../dist/services/YouTubeService');
const { config } = require('../dist/utils/config');

async function testArchiveProcessing() {
    console.log('🎬 アーカイブ処理機能のテストを開始...\n');
    
    try {
        const youtubeService = new YouTubeService();
        
        // 認証チェック
        console.log('🔑 YouTube認証チェック中...');
        const authValid = await youtubeService.checkAuth();
        if (!authValid) {
            console.error('❌ YouTube認証が無効です。OAuth認証を完了してください。');
            return;
        }
        console.log('✅ YouTube認証確認済み\n');

        // 現在のアーカイブ設定を表示
        const archiveConfig = config.getArchiveConfig();
        console.log('📋 現在のアーカイブ設定:');
        console.log(`  プライバシー設定: ${archiveConfig.privacyStatus}`);
        console.log(`  アーカイブ処理: ${archiveConfig.enableProcessing ? '有効' : '無効'}`);
        console.log(`  タイトルフォーマット: ${archiveConfig.titleFormat}`);
        console.log(`  説明文テンプレート: ${archiveConfig.descriptionTemplate.substring(0, 100)}...`);
        console.log('');

        // アーカイブ処理が無効な場合は警告
        if (!archiveConfig.enableProcessing) {
            console.log('⚠️  アーカイブ処理が無効になっています。');
            console.log('   .envファイルで ENABLE_ARCHIVE_PROCESSING=true に設定してください。\n');
        }

        // モックデータでアーカイブタイトル・説明文生成テスト
        console.log('🧪 アーカイブタイトル・説明文生成テスト:');
        
        const mockTwitchStream = {
            title: 'APEXランクマッチ配信！',
            user_name: 'TestStreamer',
            user_login: 'teststreamer',
            game_name: 'Apex Legends',
            viewer_count: 150
        };
        
        const mockStartTime = new Date('2024-01-15T20:00:00Z');
        
        const archiveTitle = youtubeService.generateArchiveTitle(
            mockTwitchStream, 
            mockStartTime, 
            archiveConfig.titleFormat
        );
        
        const archiveDescription = youtubeService.generateArchiveDescription(
            mockTwitchStream, 
            mockStartTime, 
            archiveConfig.descriptionTemplate
        );
        
        console.log('📝 生成されたアーカイブタイトル:');
        console.log(`  "${archiveTitle}"`);
        console.log(`  文字数: ${archiveTitle.length}/100文字`);
        
        console.log('\n📄 生成されたアーカイブ説明文:');
        console.log(`"${archiveDescription.substring(0, 200)}..."`);
        console.log(`  文字数: ${archiveDescription.length}/5000文字`);

        // 実際の動画IDを入力してテスト実行
        console.log('\n🎯 実際のアーカイブ処理テスト:');
        console.log('実際の動画（YouTube Live配信のアーカイブ）でテストするには、');
        console.log('以下のコマンドを実行してください:');
        console.log('');
        console.log('node tests/test-archive-processing.js [動画ID]');
        console.log('');
        console.log('例: node tests/test-archive-processing.js YQlzgIaTXoM');
        
        // コマンドライン引数から動画IDを取得
        const videoId = process.argv[2];
        if (videoId) {
            console.log(`\n🎬 動画ID "${videoId}" でアーカイブ処理テストを実行中...`);
            
            const archiveSuccess = await youtubeService.processArchiveAfterStreamEnd(
                videoId,
                mockTwitchStream,
                mockStartTime
            );
            
            if (archiveSuccess) {
                console.log('✅ アーカイブ処理テストが完了しました！');
            } else {
                console.log('❌ アーカイブ処理テストに失敗しました');
            }
        }

        console.log('\n💡 設定変更方法:');
        console.log('.envファイルを編集して以下の変数を調整できます:');
        console.log('');
        console.log('# アーカイブ設定');
        console.log('ARCHIVE_PRIVACY_STATUS=public  # public/unlisted/private');
        console.log('ENABLE_ARCHIVE_PROCESSING=true');
        console.log('ARCHIVE_TITLE_FORMAT=[アーカイブ] {originalTitle} - {date}');
        console.log('ARCHIVE_DESCRIPTION_TEMPLATE=この動画は{date}に行われたライブ配信のアーカイブです。');

        console.log('\n✅ アーカイブ処理機能のテストが完了しました！');
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生:', error.message);
        if (error.stack) {
            console.error('スタックトレース:', error.stack);
        }
    }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
    console.log('\n👋 テストを中断しました');
    process.exit(0);
});

// テスト実行
testArchiveProcessing().catch(error => {
    console.error('❌ 致命的なエラー:', error);
    process.exit(1);
});
