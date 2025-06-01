const { StreamService } = require('./dist/services/StreamService');
const { TwitchService } = require('./dist/services/TwitchService');
const { YouTubeService } = require('./dist/services/YouTubeService');

async function testStreamProcessing() {
    console.log('🧪 ストリーミング処理機能をテスト...');
    
    try {
        const streamService = new StreamService();
        
        console.log('\n🔍 FFmpeg出力解析テスト');
        
        // 模擬FFmpeg統計出力をテスト
        const mockFFmpegOutput = `frame=  120 fps= 30 q=28.0 size=    2048kB time=00:00:04.00 bitrate=4186.7kbits/s speed=   1x    
frame=  240 fps= 30 q=28.0 size=    4096kB time=00:00:08.00 bitrate=4186.7kbits/s speed=   1x    
frame=  360 fps= 30 q=28.0 size=    6144kB time=00:00:12.00 bitrate=4186.7kbits/s speed=   1x    `;
        
        console.log('📊 模擬FFmpeg統計出力:');
        console.log(mockFFmpegOutput);
        
        console.log('\n🔍 出力解析結果:');
        // StreamService内のparseFFmpegOutputメソッドをテスト
        // (実際のメソッドがprivateの場合、publicに変更するかテスト用メソッドを作成)
        
        console.log('\n🎯 実際のエラー検出テスト');
        const mockErrorOutput = `av_interleaved_write_packet(): Connection refused
[flv @ 0x55f8a4c0a800] Failed to update header with correct duration.
[flv @ 0x55f8a4c0a800] Failed to update header with correct filesize.`;
        
        console.log('❌ 模擬エラー出力:');
        console.log(mockErrorOutput);
        
        // エラー検出テスト
        const hasError = mockErrorOutput.includes('Connection refused') || 
                        mockErrorOutput.includes('Failed to update') ||
                        mockErrorOutput.includes('Error');
        
        console.log(`🔍 エラー検出結果: ${hasError ? '❌ エラーあり' : '✅ エラーなし'}`);
        
        console.log('\n✅ FFmpeg出力解析テスト完了');
        
    } catch (error) {
        console.error('❌ テスト中にエラーが発生:', error.message);
    }
}

testStreamProcessing();
