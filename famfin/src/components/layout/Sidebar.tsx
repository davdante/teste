"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Wallet, PiggyBank, CreditCard, BarChart3, Settings } from 'lucide-react';

const links = [
  { href: '/(app)/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/(app)/transactions', label: 'Movimentações', icon: Wallet },
  { href: '/(app)/budgets', label: 'Orçamentos', icon: BarChart3 },
  { href: '/(app)/goals', label: 'Metas', icon: PiggyBank },
  { href: '/(app)/accounts', label: 'Contas e Cartões', icon: CreditCard },
  { href: '/(app)/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/(app)/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="h-screen w-64 border-r bg-card p-4 sticky top-0">
      <div className="mb-6">
        <Link href="/" className="font-semibold text-lg">FamFin</Link>
      </div>
      <nav className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 transition transform',
                'bg-card hover:shadow-lg hover:-translate-y-[1px] hover:rotate-[0.5deg]',
                active ? 'bg-muted' : 'hover:bg-muted'
              )}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:translate-z-2" />
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}