import { useEffect, useState } from "react";

const personaInstructions = `
# STYLEse
- Speak Japanese, casual‑polite.  
`.trim();

const sessionUpdate = {
  type: "session.update",
  session: {
    audio: { voice: "alloy" },
    instructions: personaInstructions,
    input_audio_transcription: { "model": "whisper-1", "language": "ja" },
    tools: [],
    tool_choice: "auto",
  },
};

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [stage, setStage] = useState('init');
  const [productDescription, setProductDescription] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const e = events[0];

    // 会話履歴を更新するロジック
    if (e.type === 'response.audio_transcript.done') {
      // AIの音声応答の文字起こし
      const transcript = e.transcript;
      if (transcript && transcript.trim()) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: transcript,
            timestamp: new Date()
          }
        ]);
      }
    } else if (e.type === 'conversation.item.created' && e.item.role === 'user') {
      // ユーザーのメッセージ
      const userMessage = e.item.content?.[0]?.text || '';
      if (userMessage && userMessage.trim()) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'user',
            message: userMessage,
            timestamp: new Date()
          }
        ]);
      }
    } else if (e.type === 'conversation.item.input_audio_transcription.completed') {
      // ユーザー音声の文字起こし完了
      const transcript = e.transcript;
      if (transcript && transcript.trim()) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'user',
            message: transcript,
            timestamp: new Date()
          }
        ]);
      }
    }

    // ① セッション開始直後: 1・2 行目を発話
    if (stage === 'init' && e.type === 'session.created') {
      sendClientEvent(sessionUpdate);           // ペルソナ注入
      sendClientEvent({                         // 1・2 行目
        type: 'response.create',
        response: {
          instructions: `Say exactly:
          「これから営業のロールプレイングを始めます」
          「今回紹介する保険商品について簡単に説明してください」`
        }
      });
      setStage('waitUser');
      setFunctionAdded(true);
      return;
    }

    // ② ユーザーが最初に何か説明したら内容を保存＋3・4行目を発話
    if (stage === 'waitUser'
        && e.type === 'conversation.item.input_audio_transcription.completed') {
      
      // ユーザーの説明内容を保存
      const transcript = (e.transcript || '').trim();
      if (!transcript) return;
      setProductDescription(transcript);

      sendClientEvent({ type: 'response.cancel' });
      // 遅延を増やしてユーザーの発話終了を確実に待つ
      setTimeout(() => {
        sendClientEvent({
          type: 'response.create',
          response: {
            instructions: `
              Say exactly：
              「年齢: 32歳 会社員 (社会人6年目)
              医療保険を検討中だがコストに敏感で渋りがち
              既契約: 会社の団体保障ありだが内容を把握していない
              既婚、子供なし
              生活背景: 健康志向で、趣味はランニングと料理です。」
              
              Say exactly「それでは始めてください」
            `
          }
        });
      }, 500);
      setStage('profileDone');
      return;
    }
  }, [events, stage]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setStage('init');
      setProductDescription('');
      setChatHistory([]);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4 overflow-hidden">
      <div className="h-full bg-gray-50 rounded-md p-4 overflow-y-auto">
        <h2 className="text-lg font-bold">保険営業ロールプレイ</h2>
        {isSessionActive ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {stage === 'init' && '初期化中...'}
              {stage === 'waitUser' && '保険商品の説明をお待ちしています'}
              {stage === 'profileDone' && 'ロールプレイ実行中'}
            </p>
            
            {productDescription && (
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="font-medium text-blue-800">紹介された保険商品:</h3>
                <p className="text-sm text-blue-700 mt-1">{productDescription}</p>
              </div>
            )}

            <div className="bg-green-50 p-3 rounded-md">
              <h3 className="font-medium text-green-800">お客様プロフィール:</h3>
              <ul className="text-sm text-green-700 mt-1 space-y-1">
                <li>• 32歳 会社員 (社会人6年目)</li>
                <li>• 医療保険を検討中だがコストに敏感</li>
                <li>• 既契約: 会社の団体保障あり(内容未把握)</li>
                <li>• 既婚、子供なし</li>
                <li>• 趣味: ランニングと料理</li>
              </ul>
            </div>

            {chatHistory.length > 0 && (
              <div className="bg-white border rounded-md">
                <h3 className="font-medium text-gray-800 p-3 border-b">会話履歴:</h3>
                <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${chat.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        <div className="text-xs text-gray-500 mb-1">
                          {chat.role === 'user' ? '営業担当者' : 'お客様'}
                        </div>
                        <div className="text-sm">{chat.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {chat.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>セッションを開始してロールプレイを始めてください</p>
        )}
      </div>
    </section>
  );
}
