import React from 'react';

export default function ArchoLogo({ className = "w-full h-auto", light = false }: { className?: string; light?: boolean }) {
  const color = light ? "#D4AF37" : "#8B732E";
  
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg 
        viewBox="0 0 500 180" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <mask id="mask-a-crossbar">
            <rect x="0" y="0" width="500" height="180" fill="white" />
            {/* This rectangle hides the original crossbar of the 'A' (first letter) */}
            {/* Positioned relative to the centered text 'ARCHO' */}
            <rect x="115" y="68" width="45" height="12" fill="black" />
          </mask>
        </defs>

        {/* Main ARCHO text with mask to hide 'A' crossbar */}
        <text 
          x="50%" 
          y="105" 
          textAnchor="middle" 
          fill={color} 
          mask="url(#mask-a-crossbar)"
          style={{ 
            fontFamily: '"Cormorant Garamond", serif', 
            fontSize: '115px', 
            fontWeight: '500',
            letterSpacing: '0.02em'
          }}
        >
          ARCHO
        </text>
        
        {/* Custom crossbar for 'A' - Tapered signature stroke */}
        {/* Positioned on the first letter 'A' */}
        <path 
          d="M85 88 C 120 84, 155 80, 190 72 C 155 78, 120 82, 85 88 Z" 
          fill={color} 
        />
        
        {/* Tagline - Enlarged further as requested */}
        <text 
          x="50%" 
          y="160" 
          textAnchor="middle" 
          fill={color} 
          style={{ 
            fontFamily: '"Inter", sans-serif', 
            fontSize: '20px', 
            fontWeight: '700',
            letterSpacing: '0.3em',
            textTransform: 'uppercase'
          }}
        >
          MORTGAGE SPECIALISED AI
        </text>
      </svg>
    </div>
  );
}
