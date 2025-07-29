import { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <button
        onClick={handleStartSession}
        className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg transform transition-all duration-200 flex items-center gap-3 ${
          isActivating 
            ? "bg-gray-500 cursor-not-allowed" 
            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-105"
        }`}
        disabled={isActivating}
      >
        {isActivating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>セッションを開始中...</span>
          </>
        ) : (
          <>
            <CloudLightning className="w-5 h-5" />
            <span>セッション開始</span>
          </>
        )}
      </button>
    </div>
  );
}

function SessionActive({ stopSession, sendTextMessage }) {
  const [message, setMessage] = useState("");

  function handleSendClientEvent() {
    sendTextMessage(message);
    setMessage("");
  }

  return (
    <div className="flex items-center justify-center w-full h-full gap-3">
      <div className="flex-1 relative">
        <input
          onKeyDown={(e) => {
            if (e.key === "Enter" && message.trim()) {
              handleSendClientEvent();
            }
          }}
          type="text"
          placeholder="テキストメッセージを入力..."
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 transition-colors"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={() => {
            if (message.trim()) {
              handleSendClientEvent();
            }
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors p-2"
          disabled={!message.trim()}
        >
          <MessageSquare className={`w-5 h-5 ${!message.trim() ? 'opacity-50' : ''}`} />
        </button>
      </div>
      <button
        onClick={stopSession}
        className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
      >
        <CloudOff className="w-5 h-5" />
        <span>切断</span>
      </button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  serverEvents,
  isSessionActive,
}) {
  return (
    <div className="h-full bg-white rounded-xl shadow-lg border border-gray-100 p-4">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          serverEvents={serverEvents}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
