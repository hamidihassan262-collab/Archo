import React from 'react';

export default function ArchoLogo({ className = "w-8 h-8", showText = false }: { className?: string; showText?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${className} flex items-center justify-center`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Left Arch - Dark Navy/Ink */}
          <path 
            d="M28 78C28 78 32 45 58 22C52 40 42 62 42 62L62 55C62 55 52 72 32 78H28Z" 
            fill="#0A1E3C" 
          />
          
          {/* Right Network - Brass */}
          <g stroke="#8B732E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Main lines */}
            <path d="M58 22L72 42L82 72L62 72L58 58L58 22" />
            <path d="M58 22L62 32L72 42" />
            <path d="M62 32L52 42L58 58" />
            <path d="M52 42L62 55" />
            <path d="M62 55L72 42" />
            <path d="M62 55L62 72" />
            <path d="M58 58L62 72" />
            
            {/* Dots at intersections */}
            <circle cx="58" cy="22" r="2" fill="#8B732E" />
            <circle cx="72" cy="42" r="2" fill="#8B732E" />
            <circle cx="82" cy="72" r="2" fill="#8B732E" />
            <circle cx="62" cy="72" r="2" fill="#8B732E" />
            <circle cx="58" cy="58" r="2" fill="#8B732E" />
            <circle cx="62" cy="32" r="2" fill="#8B732E" />
            <circle cx="52" cy="42" r="2" fill="#8B732E" />
            <circle cx="62" cy="55" r="2" fill="#8B732E" />
          </g>
        </svg>
      </div>
      {showText && (
        <span className="text-archo-ink font-sans font-bold text-2xl tracking-tight">Archo</span>
      )}
    </div>
  );
}
