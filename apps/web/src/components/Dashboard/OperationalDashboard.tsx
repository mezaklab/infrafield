import React from 'react';
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDot,
  Clock3,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { DashboardStats } from '../../services/api';
import type { Asset, NotificationItem, TabType, Ticket } from '../../types';
import { CircularMetric } from '../ui/CircularMetric';

type OperationalDevice = Pick<Asset, 'id' | 'name' | 'monitoringStatus' | 'latencyMs' | 'consecutiveFailures' | 'lastSeenAt' | 'lastCheckedAt'> & {
  kind: 'asset' | 'peripheral';
  code?: string;
  category?: string;
  currentIp?: string;
  ipHistory?: Array<{ id: string; ipAddress: string; detectedAt: string; lostAt?: string }>;
};

interface Props {
  stats: DashboardStats | null;
  devices: OperationalDevice[];
  notifications: NotificationItem[];
  tickets: Ticket[];
  loading: boolean;
  onNavigate: (tab: TabType) => void;
}

const relativeTime = (value?: string) => {
  if (!value) return 'sem registro recente';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
  return `há ${Math.floor(seconds / 86400)} d`;
};

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 mb-3">
    <h2 className="text-base font-bold tracking-tight text-slate-100">{title}</h2>
    {action}
  </div>
);

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="py-2 text-sm text-slate-400 flex items-center gap-2">
    <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

const DeviceStatus = ({ status }: { status: OperationalDevice['monitoringStatus'] }) => {
  const config = {
    ONLINE: ['Online', 'bg-emerald-500', 'success-text'],
    OFFLINE: ['Offline', 'bg-rose-500', 'danger-text'],
    DEGRADED: ['Degradado', 'bg-amber-500', 'warning-text'],
    UNKNOWN: ['Desconhecido', 'bg-slate-400', 'if-text-secondary'],
  }[status || 'UNKNOWN'];
  return <span className={`ml-auto inline-flex items-center justify-end gap-1.5 text-xs font-medium whitespace-nowrap ${config[2]}`}><span className={`w-2 h-2 rounded-full ${config[1]}`} aria-hidden="true" />{config[0]}</span>;
};

const Metric = ({ label, value, detail, tone = 'neutral', icon: Icon, onClick }: {
  label: string; value: number; detail: string; tone?: 'neutral' | 'good' | 'warning' | 'critical'; icon: React.ComponentType<{ className?: string }>; onClick?: () => void;
}) => {
  const tones = {
    neutral: { value: 'text-cyan-300', icon: 'text-cyan-400 bg-cyan-500/10', accent: 'bg-cyan-400' },
    good: { value: 'text-emerald-400', icon: 'text-emerald-400 bg-emerald-500/10', accent: 'bg-emerald-400' },
    warning: { value: 'text-amber-400', icon: 'text-amber-400 bg-amber-500/10', accent: 'bg-amber-400' },
    critical: { value: 'text-rose-400', icon: 'text-rose-400 bg-rose-500/10', accent: 'bg-rose-400' },
  }[tone];
  return (
    <button onClick={onClick} className="if-panel-soft group relative min-w-0 overflow-hidden text-left rounded-xl px-3.5 py-3 hover:border-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-all duration-200">
      <span className={`absolute inset-y-3 left-0 w-0.5 rounded-r ${tones.accent}`} aria-hidden="true" />
      <span className="if-text-secondary flex items-center gap-2 text-xs sm:text-sm font-medium">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tones.icon}`}><Icon className="w-3.5 h-3.5" /></span>
        {label}
      </span>
      <strong className={`metric-number block mt-1.5 text-2xl font-bold tracking-tight ${tones.value}`}>{value}</strong>
      <span className="if-text-muted block mt-0.5 text-xs truncate">{detail}</span>
    </button>
  );
};

export const OperationalDashboard: React.FC<Props> = ({ stats, devices, notifications, tickets, loading, onNavigate }) => {
  const monitored = devices.filter((device) => device.monitoringStatus && device.monitoringStatus !== 'UNKNOWN');
  const online = devices.filter((device) => device.monitoringStatus === 'ONLINE').length;
  const offline = devices.filter((device) => device.monitoringStatus === 'OFFLINE');
  const degraded = devices.filter((device) => device.monitoringStatus === 'DEGRADED');
  const unknown = devices.filter((device) => !device.monitoringStatus || device.monitoringStatus === 'UNKNOWN').length;
  const attention = [...offline, ...degraded].sort((a, b) => (b.consecutiveFailures || 0) - (a.consecutiveFailures || 0));
  const lastCheck = devices.map((device) => device.lastCheckedAt).filter(Boolean).sort().at(-1);
  const checkedLatencies = devices.map((device) => device.latencyMs).filter((value): value is number => typeof value === 'number');
  const averageLatency = checkedLatencies.length ? checkedLatencies.reduce((sum, value) => sum + value, 0) / checkedLatencies.length : null;
  const onlineRate = devices.length ? (online / devices.length) * 100 : 0;
  const activeTickets = tickets.filter((ticket) => !['RESOLVIDO', 'CANCELADO'].includes(ticket.status));
  const criticalTickets = activeTickets.filter((ticket) => ticket.priority === 'CRITICA').length;
  const awaitingTechnician = activeTickets.filter((ticket) => !ticket.assignedToId).length;
  const categories = Object.entries(stats?.assets.categoriesCount || {}).sort((a, b) => b[1] - a[1]);
  const categoryMax = Math.max(1, ...categories.map(([, count]) => count));
  const healthRate = devices.length ? Math.round((online / devices.length) * 100) : 0;
  const recentDevices = [...devices]
    .filter((device) => device.lastCheckedAt || device.monitoringStatus !== 'UNKNOWN')
    .sort((a, b) => new Date(b.lastCheckedAt || 0).getTime() - new Date(a.lastCheckedAt || 0).getTime())
    .slice(0, 6);

  const recentChecks = devices
    .filter((device) => device.lastCheckedAt)
    .sort((a, b) => new Date(b.lastCheckedAt!).getTime() - new Date(a.lastCheckedAt!).getTime())
    .slice(0, 5);
  const ipChanges = devices.flatMap((device) => {
    const history = [...(device.ipHistory || [])].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    if (history.length < 2 || history[0].ipAddress === history[1].ipAddress) return [];
    return [{
      id: `ip-${device.id}-${history[0].id}`,
      title: device.name,
      detail: `IP alterado: ${history[1].ipAddress} → ${history[0].ipAddress}`,
      at: history[0].detectedAt,
      tone: 'INFO',
    }];
  });
  const activity = [
    ...ipChanges,
    ...notifications.slice(0, 4).map((item) => ({ id: `notification-${item.id}`, title: item.title, detail: item.message, at: item.createdAt, tone: item.type })),
    ...recentChecks.map((device) => ({
      id: `device-${device.kind}-${device.id}`,
      title: device.code || device.name,
      detail: `${device.code && device.name !== device.code ? `${device.name} · ` : ''}${device.monitoringStatus === 'ONLINE' && device.latencyMs != null ? `Online · ${device.latencyMs.toFixed(1)} ms` : device.monitoringStatus === 'OFFLINE' ? 'Offline' : device.monitoringStatus === 'DEGRADED' ? 'Monitoramento degradado' : 'Verificação concluída'}`,
      at: device.lastCheckedAt!,
      tone: device.monitoringStatus === 'OFFLINE' ? 'ALERT' : device.monitoringStatus === 'DEGRADED' ? 'WARNING' : 'INFO',
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 7);

  return (
    <div className="space-y-4">
      <section className="if-panel surface-ambient relative overflow-hidden rounded-2xl p-4" aria-labelledby="infrastructure-now">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
          <div>
            <h1 id="infrastructure-now" className="text-lg sm:text-xl font-bold tracking-tight text-white">Infraestrutura agora</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {lastCheck ? `Última verificação ${relativeTime(lastCheck)}` : 'Aguardando a primeira verificação de monitoramento'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300" aria-label={`${monitored.length} equipamentos monitorados`}>
            <CircleDot className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span><strong className="font-semibold text-slate-100">{monitored.length}</strong> monitorado{monitored.length === 1 ? '' : 's'}</span>
            {averageLatency != null && <span className="text-slate-400">· média <strong className="font-medium text-slate-200">{averageLatency.toFixed(1)} ms</strong></span>}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Metric label="Ativos" icon={Box} value={devices.length} detail={`${monitored.length} com monitoramento`} onClick={() => onNavigate('peripherals')} />
          <Metric label="Online" icon={Wifi} value={online} detail={`${onlineRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do parque`} tone="good" onClick={() => onNavigate('assets')} />
          <Metric label="Offline" icon={WifiOff} value={offline.length} detail={offline.length ? 'sem resposta' : 'nenhum indisponível'} tone="critical" onClick={() => onNavigate('assets')} />
          <Metric label="Em atenção" icon={AlertTriangle} value={degraded.length + (stats?.issues.total || 0)} detail={`${degraded.length} degradados · ${stats?.issues.total || 0} ocorrências`} tone="warning" onClick={() => onNavigate('issues')} />
        </div>
        {unknown > 0 && <p className="mt-3 text-xs text-slate-500">{unknown} equipamento{unknown === 1 ? '' : 's'} com estado desconhecido.</p>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-8 gap-4 items-start">
        <section className="if-panel lg:col-span-3 rounded-2xl p-4" aria-labelledby="attention-title">
          <SectionHeader title="Precisa de atenção" action={attention.length > 0 ? <button onClick={() => onNavigate('assets')} className="text-xs text-cyan-400 hover:text-cyan-300">Ver ativos</button> : undefined} />
          {loading ? <RefreshCw className="w-5 h-5 animate-spin text-slate-500" /> : attention.length === 0 ? (
            <EmptyState>Nenhuma ocorrência crítica no momento.</EmptyState>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {attention.slice(0, 6).map((device) => (
                <div key={`${device.kind}-${device.id}`} className="py-3 first:pt-0 flex gap-3">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${device.monitoringStatus === 'OFFLINE' ? 'text-rose-400' : 'text-amber-400'}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{device.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {device.monitoringStatus === 'OFFLINE' ? `Offline ${relativeTime(device.lastSeenAt)}` : device.latencyMs != null ? `Latência ${device.latencyMs.toFixed(1)} ms` : 'Monitoramento degradado'}
                      {(device.consecutiveFailures || 0) > 0 && ` · ${device.consecutiveFailures} falha${device.consecutiveFailures === 1 ? '' : 's'} consecutiva${device.consecutiveFailures === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="if-panel lg:col-span-5 rounded-2xl p-4" aria-labelledby="activity-title">
          <SectionHeader title="Atividade da infraestrutura" action={<Activity className="w-4 h-4 text-cyan-400" aria-hidden="true" />} />
          {loading ? <RefreshCw className="w-5 h-5 animate-spin text-slate-500" /> : activity.length === 0 ? (
            <EmptyState>Nenhuma ocorrência recente.</EmptyState>
          ) : (
            <div>
              {activity.map((item) => (
                <div key={item.id} className="relative py-2 first:pt-0 grid grid-cols-[3.5rem_0.75rem_1fr] sm:grid-cols-[4.5rem_0.75rem_1fr] gap-2 items-start group">
                  <time className="text-xs tabular-nums text-slate-400">{new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                  <span className="relative grid h-full min-h-8 place-items-start justify-center" aria-hidden="true">
                    <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--if-border)]" />
                    <span className={`relative z-10 mt-1 h-2 w-2 rounded-full ring-4 ring-[var(--if-surface)] ${item.tone === 'ALERT' ? 'bg-rose-400' : item.tone === 'WARNING' ? 'bg-amber-400' : item.tone === 'SUCCESS' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                  </span>
                  <div className="min-w-0"><p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors duration-200">{item.title}</p><p className="text-xs text-slate-400 truncate">{item.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="if-panel rounded-2xl p-4" aria-labelledby="recent-assets-title">
        <SectionHeader title="Ativos monitorados" action={<button onClick={() => onNavigate('assets')} className="text-xs font-medium text-cyan-500 hover:text-cyan-400 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></button>} />
        {recentDevices.length === 0 ? <EmptyState>Nenhum ativo monitorado recentemente.</EmptyState> : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="if-text-muted border-b if-divider text-xs"><th className="font-medium pb-2">Ativo</th><th className="font-medium pb-2">Tipo</th><th className="font-medium pb-2">IP atual</th><th className="font-medium pb-2 text-right">Latência</th><th className="font-medium pb-2 text-right">Status</th></tr></thead>
                <tbody className="divide-y if-divider">
                  {recentDevices.map((device) => (
                    <tr key={`recent-${device.kind}-${device.id}`} className="hover:bg-cyan-500/[0.035] transition-colors duration-200">
                      <td className="py-2.5 pr-3"><strong className="if-text block font-semibold">{device.code || device.name}</strong>{device.code && device.name !== device.code && <span className="if-text-muted block text-xs truncate max-w-52">{device.name}</span>}</td>
                      <td className="py-2.5 pr-3 if-text-secondary">{device.category || (device.kind === 'peripheral' ? 'Periférico' : 'Ativo')}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs if-text-secondary">{device.currentIp || '—'}</td>
                      <td className="py-2.5 text-right tabular-nums if-text-secondary">{device.latencyMs != null ? `${device.latencyMs.toFixed(1)} ms` : '—'}</td>
                      <td className="py-2.5 pl-3"><DeviceStatus status={device.monitoringStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y if-divider">
              {recentDevices.map((device) => <div key={`recent-mobile-${device.kind}-${device.id}`} className="py-3 first:pt-0">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="if-text block text-sm truncate">{device.code || device.name}</strong><span className="if-text-muted text-xs">{device.category || (device.kind === 'peripheral' ? 'Periférico' : 'Ativo')}</span></div><DeviceStatus status={device.monitoringStatus} /></div>
                <div className="mt-2 flex gap-3 text-xs if-text-secondary"><span className="font-mono">{device.currentIp || 'IP não informado'}</span><span>{device.latencyMs != null ? `${device.latencyMs.toFixed(1)} ms` : 'Sem latência'}</span></div>
              </div>)}
            </div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <section className="if-panel order-2 lg:order-1 lg:col-span-3 rounded-2xl p-4" aria-labelledby="fleet-title">
          <SectionHeader title="Parque de TI" action={<button onClick={() => onNavigate('assets')} className="text-xs text-cyan-400 flex items-center gap-1">Inventário <ArrowRight className="w-3 h-3" /></button>} />
          {categories.length === 0 ? <EmptyState>Nenhum ativo categorizado.</EmptyState> : (
            <div className="grid sm:grid-cols-[8rem_1fr] gap-4 items-center">
              <div className="flex sm:flex-col items-center justify-center gap-3 sm:gap-1.5">
                <CircularMetric value={healthRate} label="saudável" />
                <div className="flex flex-col items-center justify-center text-center text-xs leading-tight if-text-secondary sm:flex-row sm:gap-1.5">
                  <span className="success-text tabular-nums">{online} online</span>
                  <span className="hidden sm:inline" aria-hidden="true">·</span>
                  <span className="danger-text tabular-nums">{offline.length} offline</span>
                </div>
              </div>
              <div className="space-y-2.5">
              {categories.slice(0, 8).map(([name, count]) => (
                <div key={name} className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-3 items-center">
                  <div><div className="flex justify-between gap-3 text-sm"><span className="text-slate-300 truncate">{name}</span></div><div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-[width] duration-200" style={{ width: `${Math.max(3, (count / categoryMax) * 100)}%` }} /></div></div>
                  <strong className="text-right text-sm tabular-nums text-slate-200">{count}</strong>
                </div>
              ))}
              </div>
            </div>
          )}
        </section>

        <section className="if-panel order-1 lg:order-2 lg:col-span-2 rounded-2xl p-4" aria-labelledby="tickets-title">
          <SectionHeader title="Chamados" action={<button onClick={() => onNavigate('tickets')} className="text-xs text-cyan-400">Abrir fila</button>} />
          <div className="divide-y divide-slate-800/70">
            <div className="flex justify-between py-2 first:pt-0 text-sm"><span className="flex items-center gap-2 text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Em aberto</span><strong className="text-white tabular-nums">{activeTickets.length}</strong></div>
            <div className="flex justify-between py-2 text-sm"><span className="flex items-center gap-2 text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Críticos</span><strong className={criticalTickets ? 'text-rose-400' : 'text-slate-300'}>{criticalTickets}</strong></div>
            <div className="flex justify-between py-2 text-sm"><span className="flex items-center gap-2 text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Aguardando técnico</span><strong className={awaitingTechnician ? 'text-amber-400' : 'text-slate-300'}>{awaitingTechnician}</strong></div>
          </div>
          <div className="mt-2 pt-3 border-t border-slate-800/70 text-xs text-slate-400 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 text-cyan-500" />Dados atuais do Helpdesk</div>
        </section>
      </div>
    </div>
  );
};

export type { OperationalDevice };
