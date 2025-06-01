const { YouTubeService } = require('./dist/services/YouTubeService');

async function testYouTubeDiagnostics() {
    console.log('🔍 YouTube Live配信診断テストを開始...');
    
    try {
        const youtubeService = new YouTubeService();
        
        // YouTube Live Streaming診断を実行
        console.log('\n📊 YouTube Live Streaming状況を診断中...');
        const diagnostics = await youtubeService.diagnoseLiveStreamStatus();
        
        console.log('\n✅ 診断結果:');
        console.log(JSON.stringify(diagnostics, null, 2));
        
        // 新しい配信を作成してテスト
        console.log('\n🆕 テスト用配信を作成中...');
        const broadcast = await youtubeService.createLiveBroadcast(
            'テスト配信 - 診断機能確認',
            'YouTube Live配信診断機能のテスト配信です'
        );
        
        console.log(`✅ 配信作成完了: ${broadcast.id}`);
        
        // 配信状態の詳細診断
        console.log('\n🔍 作成した配信の詳細診断中...');
        const detailedDiagnostics = await youtubeService.diagnoseLiveStreamStatus(broadcast.id);
        
        console.log('\n📊 詳細診断結果:');
        console.log(JSON.stringify(detailedDiagnostics, null, 2));
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生:', error.message);
        if (error.stack) {
            console.error('スタックトレース:', error.stack);
        }
    }
}

testYouTubeDiagnostics();
