import React from 'react';

interface WindowControlsProps {
  isMac: boolean;
  isMaximized?: boolean;
}

export default function WindowControls({ isMac, isMaximized = false }: WindowControlsProps) {
  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronApi = (window as any).electron;
    if (electronApi?.window) {
      if (action === 'maximize' && isMaximized) {
        // Assuming Electron API exposes restore/unmaximize, or we just call maximize again to toggle
        if (electronApi.window.restore) {
          electronApi.window.restore();
        } else if (electronApi.window.unmaximize) {
          electronApi.window.unmaximize();
        } else {
          electronApi.window.maximize(); // Fallback toggle
        }
      } else {
        electronApi.window[action]();
      }
    }
  };

  if (isMac) {
    return (
      <div 
        className="flex gap-2 items-center px-2 py-1 select-none no-drag-region"
      >
        <button 
          onClick={() => handleWindowControl('close')} 
          className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/90 border border-[#e0443e] outline-none cursor-pointer flex items-center justify-center group"
          title="Close"
        >
          <span className="opacity-0 group-hover:opacity-100 text-[#4c0000] text-[8px] font-bold leading-none select-none -mt-px">x</span>
        </button>
        <button 
          onClick={() => handleWindowControl('minimize')} 
          className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/90 border border-[#dea123] outline-none cursor-pointer flex items-center justify-center group"
          title="Minimize"
        >
          <span className="opacity-0 group-hover:opacity-100 text-[#995700] text-[10px] font-bold leading-none select-none mt-[-2px]">-</span>
        </button>
        <button 
          onClick={() => handleWindowControl('maximize')} 
          className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/90 border border-[#1aab29] outline-none cursor-pointer flex items-center justify-center group"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <span className="opacity-0 group-hover:opacity-100 text-[#006500] text-[9px] font-bold leading-none select-none -mt-px">{isMaximized ? '↙' : '+'}</span>
        </button>
      </div>
    );
  }

  // Windows/Linux Style
  return (
    <div 
      className="flex h-full select-none no-drag-region"
    >
      <button 
        onClick={() => handleWindowControl('minimize')} 
        className="h-full w-[46px] grid place-items-center bg-transparent hover:bg-(--raised) border-none text-(--text) opacity-70 hover:opacity-100 cursor-pointer transition-colors outline-none"
        title="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button 
        onClick={() => handleWindowControl('maximize')} 
        className="h-full w-[46px] grid place-items-center bg-transparent hover:bg-(--raised) border-none text-(--text) opacity-70 hover:opacity-100 cursor-pointer transition-colors outline-none"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
            <path d="M2.5 2.5h5v5h-5zM4.5 1.5h4v4" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>
      <button 
        onClick={() => handleWindowControl('close')} 
        className="h-full w-[46px] grid place-items-center bg-transparent hover:bg-[#e81123] hover:text-white border-none text-(--text) opacity-70 hover:opacity-100 cursor-pointer transition-colors outline-none"
        title="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5.00002 4.2929L1.35355 0.646447L0.646447 1.35355L4.29292 5L0.646447 8.64645L1.35355 9.35355L5.00002 5.70711L8.64649 9.35355L9.3536 8.64645L5.70713 5L9.3536 1.35355L8.64649 0.646447L5.00002 4.2929Z" />
        </svg>
      </button>
    </div>
  );
}
