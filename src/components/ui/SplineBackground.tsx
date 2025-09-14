import { useTheme } from '@/contexts/ThemeContext';

interface SplineBackgroundProps {
  className?: string;
  opacity?: number;
}

export function SplineBackground({ className = '', opacity }: SplineBackgroundProps) {
  
  
  return (
    <div 
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ 
        opacity: opacity,
        zIndex: -1, // Use negative z-index to ensure it's behind everything
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
