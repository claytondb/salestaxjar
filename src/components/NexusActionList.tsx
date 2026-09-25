'use client';

import Link from 'next/link';
import { CalendarClock, ExternalLink, Eye, History, ShieldAlert, Store, Upload } from 'lucide-react';
import { getStateRegistrationUrl } from '@/lib/state-registration-urls';
import type { TopAction } from '@/lib/nexus-engine';

export function ActionIcon({ kind }: { kind: TopAction['kind'] }) {
  const cls = 'w-5 h-5 flex-shrink-0';
  switch (kind) {
    case 'register':
      return <ShieldAlert className={`${cls} text-red-500`} aria-hidden />;
    case 'plan':
      return <CalendarClock className={`${cls} text-purple-500`} aria-hidden />;
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

export function ActionLink({ action }: { action: TopAction }) {
  const linkClass = 'inline-flex items-center gap-1.5 text-sm font-medium text-theme-accent hover:underline';
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
  if (action.kind === 'watch' && action.stateCode) {
    return (
      <a href={`#state-${action.stateCode}`} className={linkClass}>
        See why
      </a>
    );
  }
  if (action.kind === 'import_history' || action.kind === 'connect_store') {
    return (
      <Link href="/settings#platforms" className={linkClass}>
        {action.kind === 'connect_store' ? 'Connect a store' : 'Import more orders'}
      </Link>
    );
  }
  if (action.kind === 'add_marketplace') {
    return (
      <Link href="/settings#platforms" className={linkClass}>
        Upload an Amazon report
      </Link>
    );
  }
  return null;
}

/** Numbered list of the top actions from the nexus engine. */
export default function NexusActionList({ actions }: { actions: TopAction[] }) {
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
              <ActionLink action={action} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
