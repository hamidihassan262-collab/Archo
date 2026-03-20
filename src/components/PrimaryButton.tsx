import React from 'react';
import BorderGlow from './BorderGlow';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  colors?: string[];
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  animated?: boolean;
}

const PrimaryButton = ({
  children,
  className = '',
  glowColor = '45 50 50', // Archo Brass HSL approx
  colors = ['#8B732E', '#B59410', '#D4AF37'], // Archo Brass palette
  backgroundColor = '#1A1A1A', // Archo Ink
  borderRadius = 24,
  glowRadius = 30,
  animated = false,
  ...props
}: PrimaryButtonProps) => {
  return (
    <BorderGlow
      glowColor={glowColor}
      colors={colors}
      backgroundColor={backgroundColor}
      borderRadius={borderRadius}
      glowRadius={glowRadius}
      animated={animated}
      className="inline-block transition-transform duration-300 hover:scale-105"
    >
      <button
        {...props}
        className={`w-full h-full px-6 py-3 text-archo-brass-pale font-serif font-bold transition-all hover:text-archo-cream flex items-center justify-center gap-2 ${className}`}
        style={{ background: 'transparent' }}
      >
        {children}
      </button>
    </BorderGlow>
  );
};

export default PrimaryButton;
