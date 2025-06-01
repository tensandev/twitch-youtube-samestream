const { YouTubeService } = require('./dist/services/YouTubeService');

async function testActiveLiveBroadcast() {
    console.log('🔴 アクティブなライブ配信の詳細診断...');
    
    try {
        const youtubeService = new YouTubeService();
        
        // アクティブな配信ID
        const activeBroadcastId = 'YQlzgIaTXoM';
        const activeStreamId = 'egxO475VnVx9gYIWYmFVrA1748692047651121';
        
        console.log(`📺 配信ID: ${activeBroadcastId}`);
        console.log(`📡 ストリームID: ${activeStreamId}`);
        
        // 詳細診断
        console.log('\n🔍 詳細診断を実行中...');
        const diagnostics = await youtubeService.diagnoseLiveStreamStatus(activeBroadcastId, activeStreamId);
        
        if (diagnostics) {
            console.log('\n✅ 診断完了:');
            console.log('🎬 配信情報:');
            diagnostics.broadcasts.forEach(broadcast => {
                console.log(`  - タイトル: ${broadcast.title}`);
                console.log(`  - ステータス: ${broadcast.lifeCycleStatus}`);
                console.log(`  - プライバシー: ${broadcast.privacyStatus}`);
                console.log(`  - 録画状態: ${broadcast.recordingStatus}`);
                console.log(`  - バインドストリーム: ${broadcast.boundStreamId}`);
            });
            
            console.log('\n📡 ストリーム情報:');
            diagnostics.streams.forEach(stream => {
                console.log(`  - ステータス: ${stream.status}`);
                console.log(`  - ヘルス: ${stream.health}`);
                console.log(`  - 解像度: ${stream.resolution}`);
                console.log(`  - フレームレート: ${stream.frameRate}`);
                console.log(`  - 配信方式: ${stream.ingestionType}`);
                console.log(`  - ストリームキー: ${stream.hasStreamKey ? '✅ 設定済み' : '❌ 未設定'}`);
            });
            
            console.log('\n📊 サマリー:');
            console.log(`  - 総配信数: ${diagnostics.summary.totalBroadcasts}`);
            console.log(`  - 総ストリーム数: ${diagnostics.summary.totalStreams}`);
            console.log(`  - アクティブ配信数: ${diagnostics.summary.activeBroadcasts}`);
            console.log(`  - アクティブストリーム数: ${diagnostics.summary.activeStreams}`);
            
            // 配信準備状態の確認
            console.log('\n🔧 配信準備状態を確認中...');
            const isReady = await youtubeService.verifyStreamReadiness(activeBroadcastId, activeStreamId);
            console.log(`配信準備状態: ${isReady ? '✅ 準備完了' : '⚠️ 準備中/問題あり'}`);
            
        } else {
            console.log('❌ 診断に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生:', error.message);
        if (error.stack) {
            console.error('スタックトレース:', error.stack);
        }
    }
}

testActiveLiveBroadcast();
