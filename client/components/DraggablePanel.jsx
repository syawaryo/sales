import { useState, useEffect, useRef } from "react";
import { Minimize2, Maximize2, Move } from "react-feather";
import EventLog from "./EventLog";

export default function DraggablePanel({ events }) {
  // ローカルストレージからの初期値読み込み
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { x: 100, y: 80, width: 300, height: 200 };
    }
    const savedState = JSON.parse(localStorage.getItem('logPanelState') || '{}');
    return {
      x: savedState.x !== undefined ? savedState.x : window.innerWidth - 320,
      y: savedState.y !== undefined ? savedState.y : 80,
      width: savedState.width || 300,
      height: savedState.height || 200,
      isMinimized: savedState.isMinimized || false
    };
  };
  
  const initialState = getInitialState();
  
  const [position, setPosition] = useState({ x: initialState.x, y: initialState.y });
  const [size, setSize] = useState({ width: initialState.width, height: initialState.height });
  const [isMinimized, setIsMinimized] = useState(initialState.isMinimized);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  const panelRef = useRef(null);

  // 状態をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const state = { x: position.x, y: position.y, width: size.width, height: size.height, isMinimized };
      localStorage.setItem('logPanelState', JSON.stringify(state));
    }
  }, [position, size, isMinimized]);

  // ドラッグ開始
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // リサイズ開始
  const handleResizeMouseDown = (e, direction) => {
    e.stopPropagation();
    setIsResizing(direction);
    setResizeStart({
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  // マウス移動
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // 画面内に制限
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = position.x;
        let newY = position.y;
        
        if (isResizing.includes('right')) {
          newWidth = Math.max(200, resizeStart.width + deltaX);
        }
        if (isResizing.includes('left')) {
          newWidth = Math.max(200, resizeStart.width - deltaX);
          newX = position.x + deltaX;
        }
        if (isResizing.includes('bottom')) {
          newHeight = Math.max(150, resizeStart.height + deltaY);
        }
        if (isResizing.includes('top')) {
          newHeight = Math.max(150, resizeStart.height - deltaY);
          newY = position.y + deltaY;
        }
        
        setSize({ width: newWidth, height: newHeight });
        if (isResizing.includes('left') || isResizing.includes('top')) {
          setPosition({ x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, size]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const resetPosition = () => {
    setPosition({ x: window.innerWidth - 320, y: 80 });
    setSize({ width: 300, height: 200 });
  };

  return (
    <div
      ref={panelRef}
      className={`fixed bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-200 transition-all duration-200 ${
        isDragging ? 'cursor-move' : ''
      } ${isMinimized ? 'h-auto' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? 'auto' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: 1000
      }}
    >
      {/* ヘッダー */}
      <div
        className="bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-2 text-xs font-medium text-white flex items-center justify-between rounded-t-lg cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="opacity-50">
            <Move className="w-3 h-3" />
          </div>
          <span>システムログ</span>
          <span className="text-xs opacity-70">({events.length} イベント)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={resetPosition}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="位置をリセット"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {!isMinimized && (
        <>
          <div className="h-[calc(100%-32px)] overflow-y-auto text-xs p-2 bg-gray-50">
            <EventLog events={events} />
          </div>

          {/* リサイズハンドル */}
          <div
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
          >
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 opacity-50" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          </div>
          <div
            className="resize-handle absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
          />
          <div
            className="resize-handle absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          />
          <div
            className="resize-handle absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
          />
          <div
            className="resize-handle absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          />
          <div
            className="resize-handle absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
          />
          <div
            className="resize-handle absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
          />
          <div
            className="resize-handle absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
          />
        </>
      )}
    </div>
  );
}