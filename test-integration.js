const { YouTubeService } = require('./dist/services/YouTubeService');
const { Config } = require('./dist/utils/config');

async function testThumbnailAndTitle() {
    console.log('🧪 YouTube機能（タイトル・サムネイル）の統合テストを開始します...\n');
    
    try {
        // 設定を読み込み
        const configInstance = Config.getInstance();
        const config = configInstance.getConfig();
        
        console.log('📋 現在の設定:');
        console.log('タイトル設定:');
        console.log(`  カスタムタイトル: ${config.customTitle || '(未設定)'}`);
        console.log(`  自動タイトルフォーマット: ${config.autoTitleFormat || 'デフォルト'}`);
        console.log(`  配信者名を含める: ${config.includeStreamerName !== undefined ? config.includeStreamerName : 'デフォルト(true)'}`);
        console.log(`  Twitchタイトルを含める: ${config.includeTwitchTitle !== undefined ? config.includeTwitchTitle : 'デフォルト(true)'}`);
        console.log(`  ゲーム名を含める: ${config.includeGameName !== undefined ? config.includeGameName : 'デフォルト(true)'}`);
        
        console.log('\nサムネイル設定:');
        console.log(`  自動アップロード: ${config.autoUploadThumbnail !== undefined ? config.autoUploadThumbnail : 'デフォルト(true)'}`);
        console.log(`  カスタムサムネイルパス: ${config.customThumbnailPath || '(未設定)'}`);
        console.log(`  品質設定: ${config.thumbnailQuality || 'デフォルト(1080p)'}\n`);
        
        // YouTubeServiceのインスタンスを作成
        const youtubeService = new YouTubeService(config);
        
        // テスト用のTwitchストリームデータ
        const mockStreamData = {
            title: "【APEX LEGENDS】ランク戦で頂点を目指す！視聴者参加型",
            user_name: "tensandev", 
            game_name: "Apex Legends",
            viewer_count: 1234,
            language: "ja",
            id: "12345678"
        };
        
        console.log('🎮 テスト用のTwitchストリームデータ:');
        console.log(`  ID: ${mockStreamData.id}`);
        console.log(`  タイトル: ${mockStreamData.title}`);
        console.log(`  配信者: ${mockStreamData.user_name}`);
        console.log(`  ゲーム: ${mockStreamData.game_name}`);
        console.log(`  視聴者数: ${mockStreamData.viewer_count}`);
        console.log(`  言語: ${mockStreamData.language}\n`);
        
        // タイトル生成をテスト
        console.log('🎯 タイトル生成テスト:');
        const generatedTitle = youtubeService.generateYouTubeTitle(mockStreamData);
        console.log(`生成されたタイトル: "${generatedTitle}"`);
        console.log(`文字数: ${generatedTitle.length}/100文字\n`);
        
        // サムネイルURL生成をテスト
        console.log('🖼️ サムネイルURL生成テスト:');
        const thumbnailUrl = youtubeService.getTwitchThumbnailUrl(mockStreamData.user_name, config.thumbnailQuality || '1080p');
        console.log(`生成されたサムネイルURL: ${thumbnailUrl}\n`);
        
        // 設定表示機能をテスト
        console.log('⚙️ 設定表示テスト:');
        youtubeService.displayTitleConfig();
        
        // 複数のタイトルパターンテスト
        console.log('\n🔄 タイトルパターンテスト:');
        const testPatterns = [
            { title: "今日はのんびりゲーム配信", game: "Minecraft", viewers: 567 },
            { title: "新作ゲームを初見プレイ！", game: "The Game", viewers: 89 },
            { title: "雑談配信＋質問コーナー", game: "Just Chatting", viewers: 234 },
            { title: "ホラーゲーム実況！絶叫注意", game: "Phasmophobia", viewers: 1567 }
        ];
        
        for (const pattern of testPatterns) {
            const testData = {
                ...mockStreamData,
                title: pattern.title,
                game_name: pattern.game,
                viewer_count: pattern.viewers
            };
            
            const title = youtubeService.generateYouTubeTitle(testData);
            console.log(`📺 ${pattern.title} → "${title}" (${title.length}文字)`);
        }
        
        console.log('\n✅ 統合テストが完了しました！');
        console.log('💡 実際の配信では、これらの機能が自動的に動作します。');
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生しました:', error.message);
        console.error(error.stack);
    }
}

testThumbnailAndTitle();
