import Spline from '@splinetool/react-spline';

interface SplineBackgroundProps {
  className?: string;
  opacity?: number;
}

export function SplineBackground({ className = '', opacity = 0.3 }: SplineBackgroundProps) {
  return (
    <div 
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ 
        opacity: opacity,
        zIndex: -1, // Use negative z-index to ensure it's behind everything
      }}
    >
      <Spline 
        scene="https://prod.spline.design/rhHvzkFA1uGAacuL/scene.splinecode"
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'transparent',
        }}
      />
    </div>
  );
}
