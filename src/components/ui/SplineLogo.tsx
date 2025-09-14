import Spline from '@splinetool/react-spline';

interface SplineLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  scene?: string | undefined;
}

export function SplineLogo({ className = '', size = 'md', scene = "https://prod.spline.design/JhmfCoIV9MW4Xmpv/scene.splinecode" }: SplineLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-100 h-48'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-lg`}>
      <Spline 
        scene={scene}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent'
        }}
      />
    </div>
  );
}
