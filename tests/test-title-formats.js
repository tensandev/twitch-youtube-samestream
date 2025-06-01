const { YouTubeService } = require('./dist/services/YouTubeService');
const { Config } = require('./dist/utils/config');

// テスト用の異なる設定でタイトル生成をテスト
async function testDifferentTitleFormats() {
    console.log('🧪 異なるタイトルフォーマットのテスト\n');
    
    try {
        const configInstance = Config.getInstance();
        const baseConfig = configInstance.getConfig();
        
        // テスト用のストリームデータ
        const testStream = {
            title: '【APEX LEGENDS】ランク戦でプレデター目指す！視聴者参加歓迎',
            user_name: 'tensandev',
            game_name: 'Apex Legends',
            viewer_count: 1234,
            language: 'ja'
        };
        
        console.log('🎮 テストデータ:');
        console.log(`  タイトル: ${testStream.title}`);
        console.log(`  配信者: ${testStream.user_name}`);
        console.log(`  ゲーム: ${testStream.game_name}`);
        console.log(`  視聴者数: ${testStream.viewer_count}\n`);
        
        // 異なるフォーマットをテスト
        const testFormats = [
            {
                name: '基本的なミラー配信',
                format: '[ミラー配信] {title}',
                description: 'シンプルな形式'
            },
            {
                name: '配信者とゲーム情報付き',
                format: '{streamer}の{game}配信 - {title}',
                description: '配信者とゲーム名を明示'
            },
            {
                name: '日時付きフォーマット',
                format: '【{game}】{title} | {datetime}',
                description: '配信日時を含む'
            },
            {
                name: '視聴者数付きフォーマット',
                format: '{title} - 視聴者数{viewers}人 ({date})',
                description: '視聴者数と日付を表示'
            },
            {
                name: 'YouTube風フォーマット',
                format: '🔴LIVE: {title} | {streamer} playing {game}',
                description: 'YouTube風のLIVE表示'
            },
            {
                name: 'ゲーム特化フォーマット',
                format: '【{game}実況】{title} - {streamer}',
                description: 'ゲーム実況に特化'
            },
            {
                name: '時間軸フォーマット',
                format: '[{time}開始] {title} | {streamer}',
                description: '開始時間を強調'
            },
            {
                name: '完全情報フォーマット',
                format: '{streamer}【{game}】{title} | {viewers}人視聴中 ({date})',
                description: '全ての情報を含む'
            }
        ];
        
        console.log('📊 フォーマット別テスト結果:\n');
        console.log('═'.repeat(80));
        
        for (const test of testFormats) {
            // テスト用の設定を作成
            const testConfig = { 
                ...baseConfig, 
                autoTitleFormat: test.format 
            };
            
            const youtubeService = new YouTubeService(testConfig);
            const result = youtubeService.processTitle(test.format, testStream);
            
            console.log(`\n🎯 ${test.name}`);
            console.log(`   フォーマット: ${test.format}`);
            console.log(`   説明: ${test.description}`);
            console.log(`   結果: "${result}"`);
            console.log(`   文字数: ${result.length}/100`);
            
            if (result.length > 100) {
                console.log('   ⚠️  警告: YouTube文字数制限(100文字)を超過');
            } else if (result.length > 80) {
                console.log('   ⚠️  注意: 文字数が多めです（80文字以上）');
            } else {
                console.log('   ✅ 適切な文字数です');
            }
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log('\n💡 推奨事項:');
        console.log('────────────────────────────────────────');
        console.log('• YouTube の文字数制限は100文字です');
        console.log('• 80文字以下に収めると検索結果で全て表示されます');
        console.log('• 重要な情報（ゲーム名、配信者名）は前の方に配置しましょう');
        console.log('• 絵文字を使用する場合は文字数に注意してください');
        console.log('• 長いタイトルの場合は自動省略機能を活用してください');
        
        console.log('\n✅ テストが完了しました！');
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生しました:', error.message);
    }
}

testDifferentTitleFormats();
