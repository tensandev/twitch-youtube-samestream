const { YouTubeService } = require('./dist/services/YouTubeService');
const { Config } = require('./dist/utils/config');

async function testTitleGeneration() {
    console.log('🧪 YouTubeタイトル生成機能のテストを開始します...\n');
    
    try {
        // 設定を読み込み
        const configInstance = Config.getInstance();
        const config = configInstance.getConfig();
        console.log('📋 現在の設定:');
        console.log(`  カスタムタイトル: ${config.customTitle || '(未設定)'}`);
        console.log(`  自動タイトルフォーマット: ${config.autoTitleFormat}`);
        console.log(`  配信者名を含める: ${config.includeStreamerName}`);
        console.log(`  Twitchタイトルを含める: ${config.includeTwitchTitle}`);
        console.log(`  ゲーム名を含める: ${config.includeGameName}\n`);
        
        // YouTubeServiceのインスタンスを作成
        const youtubeService = new YouTubeService(config);
        
        // テスト用のTwitchストリームデータ
        const mockStreamData = {
            title: "【APEX LEGENDS】ランク戦で頂点を目指す！",
            user_name: "tensandev", 
            game_name: "Apex Legends",
            viewer_count: 1234,
            language: "ja"
        };
        
        console.log('🎮 テスト用のTwitchストリームデータ:');
        console.log(`  タイトル: ${mockStreamData.title}`);
        console.log(`  配信者: ${mockStreamData.user_name}`);
        console.log(`  ゲーム: ${mockStreamData.game_name}`);
        console.log(`  視聴者数: ${mockStreamData.viewer_count}`);
        console.log(`  言語: ${mockStreamData.language}\n`);
        
        // タイトル生成をテスト
        const generatedTitle = youtubeService.generateYouTubeTitle(mockStreamData);
        console.log('🎯 生成されたYouTubeタイトル:');
        console.log(`"${generatedTitle}"`);
        console.log(`文字数: ${generatedTitle.length}/100文字\n`);
        
        // プレビュー機能をテスト
        console.log('👀 タイトルプレビュー:');
        youtubeService.previewTitle(mockStreamData);
        
        // 異なるフォーマットでのテスト
        console.log('\n🔄 異なるフォーマットでのテスト:');
        const testFormats = [
            "[ミラー配信] {title}",
            "{streamer}の{game}配信 - {title}",
            "【{game}】{title} | {datetime}",
            "{title} - 視聴者数{viewers}人 ({date})",
            "🔴LIVE: {title} | {streamer} playing {game}"
        ];
        
        for (const format of testFormats) {
            console.log(`\nフォーマット: ${format}`);
            const testTitle = youtubeService.processTitle(format, mockStreamData);
            console.log(`結果: "${testTitle}" (${testTitle.length}文字)`);
        }
        
        console.log('\n✅ テストが完了しました！');
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生しました:', error.message);
        console.error(error.stack);
    }
}

testTitleGeneration();
