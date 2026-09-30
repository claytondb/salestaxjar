'use client';

import Link from 'next/link';
import {
  CalendarClock,
  ExternalLink,
  Eye,
  History,
  Info,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Store,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { getStateRegistrationUrl } from '@/lib/state-registration-urls';
import type { TopAction } from '@/lib/nexus-engine';

export function ActionIcon({ kind }: { kind: TopAction['kind'] }) {
  const cls = 'w-5 h-5 flex-shrink-0';
  switch (kind) {
    case 'register':
      return <ShieldAlert className={`${cls} text-red-500`} aria-hidden />;
    case 'plan':
      return <CalendarClock className={`${cls} text-purple-500`} aria-hidden />;
    case 'past':
      return <Receipt className={`${cls} text-orange-500`} aria-hidden />;
    case 'review':
      return <Info className={`${cls} text-blue-500`} aria-hidden />;
    case 'upgrade':
      return <TrendingUp className={`${cls} text-theme-accent`} aria-hidden />;
    case 'sync':
      return <RefreshCw className={`${cls} text-theme-accent`} aria-hidden />;
    case 'import_history':
      return <History className={`${cls} text-theme-accent`} aria-hidden />;
    case 'watch':
      return <Eye className={`${cls} text-orange-500`} aria-hidden />;
    case 'add_marketplace':
      return <Upload className={`${cls} text-theme-accent`} aria-hidden />;
    default:
      return <Store className={`${cls} text-theme-accent`} aria-hidden />;
  }
}

export function ActionLink({ action, mode = 'app' }: { action: TopAction; mode?: 'app' | 'scan' }) {
  const linkClass = 'inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent hover:underline';
  if (mode === 'scan') {
    const scanText: Partial<Record<TopAction['kind'], string>> = {
      import_history: 'Add an older export',
      add_marketplace: 'Add your Amazon or Etsy export',
      connect_store: 'Add a file',
      sync: 'Add a newer export',
    };
    const text = scanText[action.kind];
    if (text) {
      return (
        <a href="#scan-upload" className={linkClass}>
          {text}
        </a>
      );
    }
    if (action.kind === 'upgrade') return null;
  }
  if ((action.kind === 'register' || action.kind === 'plan') && action.stateCode) {
    const reg = getStateRegistrationUrl(action.stateCode);
    if (reg) {
      return (
        <a href={reg.registrationUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {action.kind === 'register' ? 'Register' : 'See how to register'} ({reg.portalName})
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      );
    }
  }
  if ((action.kind === 'watch' || action.kind === 'review' || action.kind === 'past') && action.stateCode) {
    return (
      <a href={`#state-${action.stateCode}`} className={linkClass}>
        See details
      </a>
    );
  }
  switch (action.kind) {
    case 'upgrade':
      return (
        <Link href="/pricing" className={linkClass}>
          Compare plans
        </Link>
      );
    case 'sync':
      return (
        <Link href="/settings#platforms" className={linkClass}>
          Go to your connections and imports
        </Link>
      );
    case 'connect_store':
      return (
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/settings#platforms" className={linkClass}>
            Connect a store
          </Link>
          <Link href="/settings#import" className={linkClass}>
            Import an order export
          </Link>
        </span>
      );
    case 'import_history':
      return (
        <Link href="/settings#import" className={linkClass}>
          Import older orders
        </Link>
      );
    case 'add_marketplace':
      return (
        <Link href="/settings#import" className={linkClass}>
          Import your marketplace orders
        </Link>
      );
    default:
      return null;
  }
}

/** Numbered list of the top actions from the nexus engine. */
export default function NexusActionList({ actions, mode = 'app' }: { actions: TopAction[]; mode?: 'app' | 'scan' }) {
  return (
    <ol className="space-y-3">
      {actions.map((action, i) => (
        <li key={`${action.kind}-${action.stateCode ?? i}`} className="flex items-start gap-3">
          <span className="text-theme-muted text-sm w-4 pt-0.5">{i + 1}.</span>
          <ActionIcon kind={action.kind} />
          <div className="min-w-0">
            <p className="font-medium text-theme-primary">{action.title}</p>
            <p className="text-sm text-theme-muted">{action.detail}</p>
            <div className="mt-1">
              <ActionLink action={action} mode={mode} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
