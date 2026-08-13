import React from 'react';

interface CircularMetricProps {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const CircularMetric: React.FC<CircularMetricProps> = ({
  value,
  label,
  size = 80,
  strokeWidth = 7,
  className = '',
}) => {
  const normalizedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={`${normalizedValue}% ${label}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalizedValue}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--if-border)" strokeWidth={strokeWidth} />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          pathLength="100"
          stroke="var(--if-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray="100"
          strokeDashoffset={100 - normalizedValue}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center justify-center gap-0.5 text-center leading-none">
          <strong className="if-text metric-number text-xl">{normalizedValue}%</strong>
          <span className="if-text-muted text-[10px] leading-none">{label}</span>
        </div>
      </div>
    </div>
  );
};
