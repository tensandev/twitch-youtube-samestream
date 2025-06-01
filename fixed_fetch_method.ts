  /**
   * 配信のプレイリストURL（M3U8）を取得する
   * 注意: これは非公式なAPIを使用する可能性があります
   */
  public async getStreamPlaylistUrl(channelName: string): Promise<string | null> {
    try {
      logger.twitch(`プレイリストURLを取得中: ${channelName}`);

      // Twitch の非公式 API を使用してプレイリストを取得
      console.log('🐛 [DEBUG] GraphQL APIにリクエスト送信中...');
      
      const requestData = [{
        operationName: 'PlaybackAccessToken_Template',
        query: 'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature   }  videoPlaybackAccessToken(id: $vodID, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature  }}',
        variables: {
          login: channelName,
          isLive: true,
          vodID: '',
          isVod: false,
          playerType: 'site'
        }
      }];
      
      console.log('🐛 [DEBUG] リクエストボディ:', JSON.stringify(requestData, null, 2));
      
      // fetch APIを使用（Node.js 18+で利用可能）
      const response = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: {
          'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(requestData)
      });

      console.log('🐛 [DEBUG] レスポンスステータス:', response.status);
      console.log('🐛 [DEBUG] レスポンスヘッダー:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🐛 [DEBUG] GraphQLレスポンス:', JSON.stringify(responseData, null, 2));

      if (!responseData[0]?.data?.streamPlaybackAccessToken) {
        console.log('🐛 [DEBUG] streamPlaybackAccessTokenが取得できませんでした');
        logger.warn(`アクセストークンの取得に失敗: ${channelName}`, '🔑❌');
        return null;
      }

      const { value, signature } = responseData[0].data.streamPlaybackAccessToken;
      console.log('🐛 [DEBUG] アクセストークン取得成功');
      
      // プレイリストURLを構築
      const playlistUrl = `https://usher.ttvnw.net/api/channel/hls/${channelName}.m3u8?client_id=kimne78kx3ncx6brgo4mv6wki5h1ko&token=${encodeURIComponent(value)}&sig=${signature}&allow_source=true&allow_audio_only=true&allow_spectre=true&p=${Math.floor(Math.random() * 1000000)}`;

      logger.success(`プレイリストURLを取得しました: ${channelName}`);
      logger.debug(`URL: ${playlistUrl.substring(0, 100)}...`);

      return playlistUrl;
    } catch (error) {
      console.log('🐛 [DEBUG] getStreamPlaylistUrlでエラー:', error);
      logger.error(`プレイリストURLの取得に失敗: ${channelName}`, error as Error);
      return null;
    }
  }
