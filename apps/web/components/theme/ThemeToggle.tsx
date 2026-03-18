"use client";

import React, { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export const ThemeToggle: React.FC = () => {
  const { toggleTheme } = useTheme();
  const [rippling, setRippling] = useState(false);

  const handleToggle = () => {
    setRippling(false);
    // Force reflow for animation
    setTimeout(() => {
      setRippling(true);
      toggleTheme();
    }, 10);
    setTimeout(() => setRippling(false), 500);
  };

  return (
    <button 
      className="theme-toggle" 
      onClick={handleToggle} 
      aria-label="Toggle theme"
    >
      <div className="toggle-stars">
        <div className="t-star ts1" />
        <div className="t-star ts2" />
        <div className="t-star ts3" />
        <div className="t-star ts4" />
      </div>
      <div className="t-cloud tc1" />
      <div className="t-cloud tc2" />
      
      <div className={cn("toggle-knob", rippling && "t-rippling")}>
        <div className="t-ripple" />
        
        <div className="t-sun">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="#c8860a" />
            <g stroke="#c8860a" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.9" y1="4.9" x2="7.1" y2="7.1" />
              <line x1="16.9" y1="16.9" x2="19.1" y2="19.1" />
              <line x1="19.1" y1="4.9" x2="16.9" y2="7.1" />
              <line x1="7.1" y1="16.9" x2="4.9" y2="19.1" />
            </g>
          </svg>
        </div>
        
        <div className="t-moon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#a78bfa" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  );
};
