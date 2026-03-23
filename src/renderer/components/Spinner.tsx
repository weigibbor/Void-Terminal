interface SpinnerProps {
  size?: number;
  color?: string;
  trackColor?: string;
  strokeWidth?: number;
  speed?: 'normal' | 'slow';
  className?: string;
}

export function Spinner({
  size = 20,
  color = 'var(--accent)',
  trackColor = 'var(--border)',
  strokeWidth = 2,
  speed = 'normal',
  className,
}: SpinnerProps) {
  const r = size / 2 - strokeWidth;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={`${speed === 'slow' ? 'void-spin-slow' : 'void-spin'} ${className || ''}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <path
        d={`M${size / 2} ${strokeWidth} a${r} ${r} 0 0 1 ${r} ${r}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
