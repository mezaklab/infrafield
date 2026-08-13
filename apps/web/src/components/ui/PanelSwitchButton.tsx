import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PanelSwitchButtonProps {
  destination: 'operational' | 'admin';
  label: string;
  compact?: boolean;
  className?: string;
  onClick: () => void;
}

export const PanelSwitchButton: React.FC<PanelSwitchButtonProps> = ({
  destination,
  label,
  compact = false,
  className = '',
  onClick,
}) => {
  const isOperational = destination === 'operational';
  const Icon = isOperational ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel-switch ${isOperational ? 'panel-switch-operational' : 'panel-switch-admin'} ${compact ? 'panel-switch-compact' : ''} ${className}`}
    >
      <span className="panel-switch-content">
        <Icon className="panel-switch-icon" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      {!compact && <span className="panel-switch-badge">{isOperational ? 'Campo' : 'ADM'}</span>}
    </button>
  );
};
