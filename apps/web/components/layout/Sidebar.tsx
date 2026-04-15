'use client';

import { useState, type ComponentType } from 'react';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Handshake,
    Landmark,
    LogOut,
    User
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type MenuView = 'dashboard' | 'banks' | 'reconciliation' | 'receivables' | 'payables' | 'settings' | 'account';

type NavIconProps = { className?: string };

const MoneyUpIcon: ComponentType<NavIconProps> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-4 w-4 shrink-0', className)}
        aria-hidden="true"
    >
        <path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" />
        <path d="M18 12h.01" />
        <path d="M19 22v-6" />
        <path d="m22 19-3-3-3 3" />
        <path d="M6 12h.01" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const MoneyDownIcon: ComponentType<NavIconProps> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('h-4 w-4 shrink-0', className)}
        aria-hidden="true"
    >
        <path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5" />
        <path d="m16 19 3 3 3-3" />
        <path d="M18 12h.01" />
        <path d="M19 16v6" />
        <path d="M6 12h.01" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const groups: Array<{
    title: string;
    items: Array<{ key: Exclude<MenuView, 'account'>; label: string; icon: ComponentType<NavIconProps> }>;
}> = [
        {
            title: 'PRINCIPAL',
            items: [{ key: 'dashboard', label: 'Tesouraria', icon: BarChart3 }]
        },
        {
            title: 'OPERAÇÕES',
            items: [
                { key: 'banks', label: 'Contas Bancárias', icon: Landmark },
                { key: 'reconciliation', label: 'Reconciliação', icon: Handshake },
                { key: 'receivables', label: 'Contas a Receber', icon: MoneyUpIcon },
                { key: 'payables', label: 'Contas a Pagar', icon: MoneyDownIcon }
            ]
        },
        {
            title: 'SISTEMA',
            items: [{ key: 'settings', label: 'Definições', icon: BarChart3 }]
        }
    ];

export function Sidebar(props: {
    view: MenuView;
    setView: (view: MenuView) => void;
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    userName: string;
    userEmail: string;
    onMyAccount: () => void;
    onLogout: () => void;
}) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    return (
        <aside className={cn('sticky top-0 z-40 h-screen w-64 shrink-0 flex-col overflow-visible bg-slate-900 text-slate-300 shadow-2xl shadow-slate-950/20 lg:flex', props.isCollapsed && 'w-[4.5rem]')}>
            <div className="flex items-center justify-between border-b border-white/10 p-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">T</div>
                    {!props.isCollapsed && (
                        <div>
                            <div className="text-sm font-semibold text-white">Tesouraria</div>
                            <div className="text-xs text-slate-400">Mapa Financeiro</div>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => props.setIsCollapsed(!props.isCollapsed)}
                    className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                    title={props.isCollapsed ? 'Expandir menu' : 'Encolher menu'}
                >
                    {props.isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {!props.isCollapsed && (
                <div className="border-b border-white/10 px-3 py-3">
                    <label className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Empresa</label>
                    <select className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                        <option>Acme Portugal, Lda</option>
                        <option>Acme Digital, Lda</option>
                        <option>Sub-Holding, SA</option>
                    </select>
                </div>
            )}

            <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3 scrollbar">
                {groups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        {!props.isCollapsed && (
                            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                {group.title}
                            </p>
                        )}

                        <div className="overflow-hidden rounded-lg border border-white/10">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => props.setView(item.key)}
                                        title={props.isCollapsed ? item.label : undefined}
                                        className={cn(
                                            'flex w-full items-center gap-3 border-l-4 border-b border-white/10 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0',
                                            props.isCollapsed && 'justify-center px-2',
                                            props.view === item.key
                                                ? 'border-l-blue-400 bg-white/10 text-white'
                                                : 'border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {!props.isCollapsed && item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="relative border-t border-white/10 p-3">
                <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    className={cn('flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left hover:bg-white/10', props.isCollapsed && 'justify-center p-2')}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                        {props.userName.slice(0, 2).toUpperCase()}
                    </div>
                    {!props.isCollapsed && (
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-white">{props.userName}</div>
                            <div className="truncate text-xs text-slate-400">{props.userEmail}</div>
                        </div>
                    )}
                    {!props.isCollapsed && <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>

                {isUserMenuOpen && (
                    <div className={cn('absolute bottom-16 z-50 w-48 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl', props.isCollapsed ? 'left-2' : 'left-3')}>
                        <button
                            type="button"
                            onClick={() => {
                                props.onMyAccount();
                                setIsUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 border-b border-slate-700 px-3 py-2.5 text-sm text-slate-100 hover:bg-slate-700"
                        >
                            <User className="h-4 w-4" />
                            Minha conta
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                props.onLogout();
                                setIsUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-300 hover:bg-slate-700"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
