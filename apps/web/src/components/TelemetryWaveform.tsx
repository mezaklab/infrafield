import React from 'react';

interface TelemetryWaveformProps {
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  speed?: 'normal' | 'fast';
}

/**
 * Componente de Gráfico de Telemetria com Onda Eletrônica (ECG / Osciloscópio) em Tempo Real
 * Utiliza stroke-dashoffset em CSS keyframes para simular o traço do sinal correndo horizontalmente.
 */
export const TelemetryWaveform: React.FC<TelemetryWaveformProps> = ({
  color = '#10b981',
  width = 60,
  height = 18,
  className = '',
  speed = 'normal',
}) => {
  // Caminho da onda EKG com batimentos periódicos
  const pathD = "M 0 12 H 12 L 16 4 L 20 20 L 24 8 L 28 16 L 32 12 H 48 L 52 4 L 56 20 L 60 8 L 64 16 L 68 12 H 84 L 88 4 L 92 20 L 96 8 L 100 16 L 104 12 H 120";

  return (
    <div className={`inline-flex items-center overflow-hidden ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 select-none"
      >
        {/* Linha de fundo opaca (trilho estático) */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
        />

        {/* Traço animado da onda de sinal fluindo em loop contínuo */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={speed === 'fast' ? 'animate-ecg-line-fast' : 'animate-ecg-line'}
        />
      </svg>
    </div>
  );
};
