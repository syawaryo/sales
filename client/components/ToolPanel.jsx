import { useEffect, useState, useRef } from "react";

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
  mode
}) {
  // 会話フロー管理
  const [functionAdded, setFunctionAdded] = useState(false);
  const [stage, setStage] = useState('init');
  const [chatHistory, setChatHistory] = useState([]);
  const [processedEventIds, setProcessedEventIds] = useState(new Set());
  const [processedMessages, setProcessedMessages] = useState(new Set());

  // 設定内容
  const [insurancePlan, setInsurancePlan] = useState({
    name: '医療保険プラン',
    type: '定期型',
    monthlyPremium: '3,000円',
    coverage: '入院日額10,000円、手術給付金最大40万円',
    features: '先進医療特約付き、がん診断一時金100万円'
  });

  const [customerPersona, setCustomerPersona] = useState({
    age: '32',
    occupation: '会社員',
    experience: '6年目',
    maritalStatus: '既婚',
    children: 'なし',
    existingInsurance: '会社の団体保障あり（内容未把握）',
    concerns: 'コストに敏感',
    hobbies: 'ランニング、料理'
  });

  // 動的にペルソナ指示を生成
  const generatePersonaInstructions = () => {
    return `
# ROLE
あなたは${customerPersona.age}歳の${customerPersona.occupation}（${customerPersona.experience}）として、保険営業のを受ける側を演じます。

# プロフィール
- 年齢: ${customerPersona.age}歳 ${customerPersona.occupation} (${customerPersona.experience})
- ${insurancePlan.type}の${insurancePlan.name}を検討中だが${customerPersona.concerns}
- 既契約: ${customerPersona.existingInsurance}
- ${customerPersona.maritalStatus}、子供${customerPersona.children}
- 趣味: ${customerPersona.hobbies}

# STYLE
- 日本語で話す
- カジュアルで丁寧な口調
- ${customerPersona.concerns}なので、詳しい説明を求める
- 短い返答から始めて、質問されたら詳しく答える
- どちらかというと保守的で、内容には反論しがちで慎重な態度を示す
- 保険については何も知らない

# GOAL
営業を受ける会社員として振舞う
`.trim();
  };

  // イベント処理
  useEffect(() => {
    if (!events || events.length === 0) return;

    // すべてのイベントを処理
    events.forEach(e => {
    
    // アシスタントの応答を処理
    if (e.type === 'response.done' || 
        e.type === 'response.audio_transcript.done' ||
        e.type === 'response.output_item.done' ||
        e.type === 'conversation.item.created') {
      
      let transcript = null;
      let messageId = null;
      
      // 各イベントタイプに応じてtranscriptとmessageIdを取得
      if (e.type === 'response.done') {
        const output = e.response?.output?.[0];
        transcript = output?.content?.[0]?.transcript;
        messageId = output?.id;
      } else if (e.type === 'response.audio_transcript.done') {
        transcript = e.transcript;
        messageId = e.item_id;
      } else if (e.type === 'response.output_item.done') {
        transcript = e.item?.content?.[0]?.transcript;
        messageId = e.item?.id;
      } else if (e.type === 'conversation.item.created' && e.item?.role === 'assistant') {
        transcript = e.item?.content?.[0]?.transcript;
        messageId = e.item?.id;
      }
      
      // メッセージIDまたは内容で重複チェック
      const messageKey = messageId || transcript;
      if (transcript && transcript.trim() && messageKey && !processedMessages.has(messageKey)) {
        console.log('Adding assistant message:', e.type, transcript);
        setProcessedMessages(prev => new Set([...prev, messageKey]));
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          message: transcript,
          timestamp: new Date()
        }]);
      }
    }
    
    // ユーザーの入力を処理
    else if (e.type === 'conversation.item.input_audio_transcription.completed' ||
             e.type === 'conversation.item.created') {
      
      let transcript = null;
      let messageId = null;
      
      if (e.type === 'conversation.item.input_audio_transcription.completed') {
        transcript = e.transcript;
        messageId = e.item_id;
      } else if (e.type === 'conversation.item.created' && e.item?.role === 'user') {
        transcript = e.item?.content?.[0]?.transcript || e.item?.content?.[0]?.text;
        messageId = e.item?.id;
      }
      
      const messageKey = messageId || transcript;
      if (transcript && transcript.trim() && messageKey && !processedMessages.has(messageKey)) {
        console.log('Adding user message:', e.type, transcript);
        setProcessedMessages(prev => new Set([...prev, messageKey]));
        setChatHistory(prev => [...prev, {
          role: 'user',
          message: transcript,
          timestamp: new Date()
        }]);
      }
    }

    // セッション開始時の処理
    if (stage === 'init' && e.type === 'session.created') {
      const eventId = e.event_id || JSON.stringify(e);
      if (!processedEventIds.has(eventId)) {
        setProcessedEventIds(prev => new Set([...prev, eventId]));
        
        const sessionUpdate = {
          type: "session.update",
          session: {
            voice: "alloy",
            instructions: generatePersonaInstructions(),
            input_audio_transcription: { "model": "whisper-1", "language": "ja" },
            tools: [],
            tool_choice: "auto",
            temperature: 0.6,
          },
        };
        
        sendClientEvent(sessionUpdate);
        setStage('waitUser');
        setFunctionAdded(true);
        return;
      }
    }
    });
  }, [events, stage, insurancePlan, customerPersona]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setStage('init');
      setChatHistory([]);
      setProcessedEventIds(new Set());
      setProcessedMessages(new Set());
    }
  }, [isSessionActive]);

  // 設定画面
  if (mode === 'settings') {
    return (
      <div className="h-full bg-white rounded-2xl shadow-lg p-4 overflow-y-auto border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">シミュレーション設定</h2>
          {!isSessionActive && (
            <div className="text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                設定をカスタマイズしてセッションを開始
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {/* 保険プラン設定 */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-500 text-white p-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="font-bold text-base text-blue-900">保険プラン情報</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">プラン名</label>
                <input
                  type="text"
                  value={insurancePlan.name}
                  onChange={(e) => setInsurancePlan({...insurancePlan, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="例: 充実医療保障プラン"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">保険タイプ</label>
                <select
                  value={insurancePlan.type}
                  onChange={(e) => setInsurancePlan({...insurancePlan, type: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                >
                  <option value="定期型">定期型</option>
                  <option value="終身型">終身型</option>
                  <option value="養老型">養老型</option>
                  <option value="収入保障型">収入保障型</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">月額保険料</label>
                <input
                  type="text"
                  value={insurancePlan.monthlyPremium}
                  onChange={(e) => setInsurancePlan({...insurancePlan, monthlyPremium: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="例: 3,000円"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">保障内容</label>
                <textarea
                  value={insurancePlan.coverage}
                  onChange={(e) => setInsurancePlan({...insurancePlan, coverage: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none h-20"
                  disabled={isSessionActive}
                  placeholder="例: 入院日額10,000円、手術給付金最大40万円"
                />
              </div>
            </div>
          </div>

          {/* 顧客ペルソナ設定 */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-emerald-500 text-white p-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <h3 className="font-bold text-base text-emerald-900">顧客ペルソナ</h3>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">年齢</label>
                  <input
                    type="text"
                    value={customerPersona.age}
                    onChange={(e) => setCustomerPersona({...customerPersona, age: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={isSessionActive}
                    placeholder="32"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">職業</label>
                  <input
                    type="text"
                    value={customerPersona.occupation}
                    onChange={(e) => setCustomerPersona({...customerPersona, occupation: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={isSessionActive}
                    placeholder="会社員"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">経験年数</label>
                <input
                  type="text"
                  value={customerPersona.experience}
                  onChange={(e) => setCustomerPersona({...customerPersona, experience: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="6年目"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">婚姻状況</label>
                  <select
                    value={customerPersona.maritalStatus}
                    onChange={(e) => setCustomerPersona({...customerPersona, maritalStatus: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={isSessionActive}
                  >
                    <option value="既婚">既婚</option>
                    <option value="未婚">未婚</option>
                    <option value="離婚">離婚</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">子供</label>
                  <select
                    value={customerPersona.children}
                    onChange={(e) => setCustomerPersona({...customerPersona, children: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={isSessionActive}
                  >
                    <option value="なし">なし</option>
                    <option value="1人">1人</option>
                    <option value="2人">2人</option>
                    <option value="3人以上">3人以上</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">懸念事項</label>
                <input
                  type="text"
                  value={customerPersona.concerns}
                  onChange={(e) => setCustomerPersona({...customerPersona, concerns: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="コストに敏感"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">既存保険</label>
                <input
                  type="text"
                  value={customerPersona.existingInsurance}
                  onChange={(e) => setCustomerPersona({...customerPersona, existingInsurance: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="会社の団体保障あり"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">趣味</label>
                <input
                  type="text"
                  value={customerPersona.hobbies}
                  onChange={(e) => setCustomerPersona({...customerPersona, hobbies: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={isSessionActive}
                  placeholder="ランニング、料理"
                />
              </div>
            </div>
          </div>
        </div>

        {isSessionActive && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div className="text-sm text-amber-800">
              <p className="font-semibold">セッション実行中</p>
              <p className="text-amber-700">設定を変更するにはセッションを終了してください</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // チャット画面
  if (mode === 'chat') {
    const chatContainerRef = useRef(null);
    
    // 新しいメッセージが追加されたときに自動スクロール
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [chatHistory]);
    
    return (
      <div className="h-full bg-white rounded-2xl shadow-xl flex flex-col border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-lg shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">会話履歴</h2>
                {isSessionActive && (
                  <p className="text-sm text-gray-600">
                    {stage === 'init' && 'セッションを初期化中...'}
                    {stage === 'waitUser' && '保険商品の説明をお待ちしています'}
                    {stage === 'profileDone' && 'ロールプレイ実行中'}
                  </p>
                )}
              </div>
            </div>
            {isSessionActive && stage === 'profileDone' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>オンライン</span>
              </div>
            )}
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {!isSessionActive ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 max-w-md text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">ロールプレイを始めましょう</h3>
                <p className="text-sm text-gray-600 mb-1">セッションを開始して、AI顧客との</p>
                <p className="text-sm text-gray-600">保険営業練習を始めてください</p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">上部の設定でシナリオをカスタマイズできます</p>
                </div>
              </div>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-48 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
                <p className="text-sm text-gray-500 mt-4">会話を準備中...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((chat, index) => (
                <div key={index} className={`flex gap-3 ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {chat.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[70%] ${chat.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`group relative ${chat.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                        chat.role === 'user' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                        <div className={`text-xs font-medium mb-1 ${
                          chat.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {chat.role === 'user' ? '営業担当者' : 'お客様'}
                        </div>
                        <div className="text-sm leading-relaxed">{chat.message}</div>
                      </div>
                      <div className={`text-xs text-gray-400 mt-1 ${chat.role === 'user' ? 'text-right mr-2' : 'ml-2'}`}>
                        {chat.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {chat.role === 'user' && (
                    <div className="flex-shrink-0 order-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}