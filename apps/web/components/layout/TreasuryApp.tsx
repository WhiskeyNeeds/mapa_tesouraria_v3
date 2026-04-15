'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sidebar, type MenuView } from './Sidebar';
import { Button } from '../ui/button';
import { CashflowDashboard } from '../dashboard/CashflowDashboard';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { cn } from '../../lib/utils';

const loginSchema = z.object({
    email: z.string().email('Email invalido'),
    password: z.string().min(6, 'Minimo 6 caracteres')
});

type LoginInput = z.infer<typeof loginSchema>;

type CashflowPoint = {
    month: string;
    inflow: number;
    outflow: number;
    balance: number;
};

type CashflowRow = {
    id: string;
    label: string;
    kind: 'summary' | 'inflow' | 'inflow-child' | 'outflow' | 'outflow-child';
    values: number[];
};

type CashflowMatrixResponse = {
    periodLabel: string;
    scenarioLabel: string;
    kpi: { label: string; amount: number; currency: string };
    months: string[];
    chart: CashflowPoint[];
    rows: CashflowRow[];
};

type BankTransaction = {
    id: string;
    name: string;
    category: string;
    paymentDate: string;
    amount: number;
};

type Collection<T> = { items: T[] };

type ExpectedChartPoint = { date: string; balance: number };
type WeeklyRow = { id: string; label: string; values: number[] };
type CalendarTransaction = {
    id: string;
    name: string;
    category: string;
    bankAccount: string;
    amountInclTaxes: number;
    cumulativeCashflow: number;
};

type ExpectedPositioningResponse = {
    title: string;
    periodLabel: string;
    dateRangeLabel: string;
    accountsLabel: string;
    expectedLabel: string;
    chart: ExpectedChartPoint[];
    weeks: string[];
    balanceSummaryRows: WeeklyRow[];
    cashflowRows: WeeklyRow[];
    calendarKpis: {
        cashAvailable: number;
        cashInflow: number;
        cashOutflow: number;
        closingBalance: number;
    };
    calendarDayLabel: string;
    calendarTransactions: CalendarTransaction[];
};

type BankJournalEntry = {
    id: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
};

type BankJournalResponse = {
    title: string;
    periodLabel: string;
    kpis: {
        entries: number;
        debitTotal: number;
        creditTotal: number;
        netBalance: number;
    };
    summaryRows: BankJournalEntry[];
    filters: {
        dateRange: { from: string; to: string };
        journalType: string;
        account: string;
    };
};

type LoanData = {
    id: string;
    provider: string;
    amount: number;
    currency: string;
    startDate: string;
    maturityDate: string;
    rate: string;
    monthlyPayment: number;
    outstandingBalance: number;
    status: string;
    nextPaymentDate: string;
    nextPaymentAmount: number;
};

type LineOfCredit = {
    id: string;
    provider: string;
    limit: number;
    utilization: number;
    availableBalance: number;
    rate: string;
    status: string;
};

type FinancingResponse = {
    title: string;
    periodLabel: string;
    totalOutstanding: number;
    totalScheduled: number;
    activeLoans: LoanData[];
    linesOfCredit: LineOfCredit[];
    upcomingPayments: Array<{ id: string; date: string; provider: string; amount: number; type: string }>;
    scheduleChart: Array<{ month: string; payments: number; principal: number; interest: number }>;
};

function formatCurrency(value: number, currency = 'EUR') {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

function formatIbanPreview(value: string) {
    const compact = value.replace(/\s+/g, '');
    const countryPrefix = compact.slice(0, 4);
    const firstEightDigits = compact.slice(4, 12);
    const lastFourDigits = compact.slice(-4);
    return `${countryPrefix} ${firstEightDigits} •••• •••• ${lastFourDigits}`;
}

function rowTone(kind: CashflowRow['kind']) {
    if (kind === 'inflow') return 'text-emerald-700 bg-emerald-50';
    if (kind === 'outflow') return 'text-rose-700 bg-rose-50';
    if (kind.includes('child')) return 'text-slate-600';
    return 'text-slate-800 bg-slate-50';
}

export function TreasuryApp() {
    const [view, setView] = useState<MenuView>('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [selectedCashflowRowId, setSelectedCashflowRowId] = useState<string | null>(null);
    const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
    const [expectedTab, setExpectedTab] = useState<'balance' | 'table' | 'calendar'>('balance');

    const { token, user, setSession, logout } = useAuthStore();

    const loginForm = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: 'demo@bizzpm.pt', password: '123456' }
    });

    const loginMutation = useMutation({
        mutationFn: async (values: LoginInput) => {
            const { data } = await api.post('/v1/auth/login', values);
            return data as { accessToken: string; user: { email: string; name: string } };
        },
        onSuccess: (data) => {
            setSession(data.accessToken, data.user);
            toast.success('Sessao iniciada com sucesso.');
        },
        onError: () => toast.error('Falha no login. Usa demo@bizzpm.pt / 123456')
    });

    const cashflowQuery = useQuery({
        queryKey: ['cashflow-mirror'],
        queryFn: async () => {
            const { data } = await api.get('/v1/treasury/cashflow/matrix');
            return data as CashflowMatrixResponse;
        },
        enabled: Boolean(token)
    });

    const bankTransactionsQuery = useQuery({
        queryKey: ['bank-transactions'],
        queryFn: async () => {
            const { data } = await api.get('/v1/treasury/bank/transactions');
            return (data as Collection<BankTransaction>).items;
        },
        enabled: Boolean(token)
    });

    const expectedQuery = useQuery({
        queryKey: ['expected-positioning'],
        queryFn: async () => {
            const { data } = await api.get('/v1/treasury/expected/positioning');
            return data as ExpectedPositioningResponse;
        },
        enabled: Boolean(token)
    });

    const bankJournalQuery = useQuery({
        queryKey: ['bank-journal'],
        queryFn: async () => {
            const { data } = await api.get('/v1/treasury/bank/journal');
            return data as BankJournalResponse;
        },
        enabled: Boolean(token)
    });

    const financingQuery = useQuery({
        queryKey: ['financing'],
        queryFn: async () => {
            const { data } = await api.get('/v1/treasury/financing');
            return data as FinancingResponse;
        },
        enabled: Boolean(token)
    });

    const selectedCashflowRow = useMemo(
        () => cashflowQuery.data?.rows.find((row) => row.id === selectedCashflowRowId) ?? null,
        [cashflowQuery.data?.rows, selectedCashflowRowId]
    );

    const selectedBankTransactions = useMemo(() => {
        const all = bankTransactionsQuery.data ?? [];
        return all.filter((item) => selectedBankIds.includes(item.id));
    }, [bankTransactionsQuery.data, selectedBankIds]);

    const selectedBankTotal = selectedBankTransactions.reduce((acc, item) => acc + item.amount, 0);

    if (!token) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4">
                <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-blue-950/20 sm:p-10">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">T</div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Tesouraria</h1>
                            <p className="text-xs text-slate-500">Mapa de Tesouraria BizzPm</p>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Iniciar sessao</h2>
                    <p className="mt-1 text-sm text-slate-500">Acede a tua area de tesouraria</p>

                    <form className="mt-6 space-y-4" onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))}>
                        <div>
                            <label className="text-xs font-medium text-slate-600">Email</label>
                            <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...loginForm.register('email')} />
                            <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.email?.message}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600">Palavra-passe</label>
                            <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" {...loginForm.register('password')} />
                            <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.password?.message}</p>
                        </div>
                        <Button className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={loginMutation.isPending}>
                            {loginMutation.isPending ? 'A entrar...' : 'Entrar'}
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-xs text-slate-400">Protegido por TLS 1.3 - 2FA disponivel - RGPD</p>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-1 sm:p-2 lg:p-3 xl:p-4">
            <div className={`grid w-full grid-cols-1 gap-2 lg:gap-3 xl:gap-4 ${isSidebarCollapsed ? 'lg:grid-cols-[4.5rem,1fr]' : 'lg:grid-cols-[16rem,1fr]'}`}>
                <Sidebar
                    view={view}
                    setView={setView}
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                    userName={user?.name ?? 'Utilizador'}
                    userEmail={user?.email ?? 'sem-email@local'}
                    onMyAccount={() => setView('account')}
                    onLogout={logout}
                />

                <section className="min-w-0 space-y-3 lg:pl-1 xl:space-y-4">
                    {view === 'dashboard' && <CashflowDashboard />}

                    {view !== 'dashboard' && (
                        <>
                            <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/50 backdrop-blur sm:px-4 lg:px-5 xl:px-6">
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                                        {view === 'banks' && 'Cashflow'}
                                        {view === 'reconciliation' && 'Bank - All transactions'}
                                        {view === 'receivables' && 'Expected - Cash positioning'}
                                        {view === 'payables' && 'Bank journal'}
                                        {view === 'settings' && 'Financing'}
                                        {view === 'account' && 'Minha conta'}
                                    </h2>
                                    <p className="hidden text-xs text-slate-400 sm:block">Dados mock alinhados com o inventario funcional</p>
                                </div>
                                <Button variant="outline" onClick={() => logout()} className="h-9 rounded-lg border-slate-300 bg-white px-4 text-sm hover:bg-slate-50">
                                    Terminar sessao
                                </Button>
                            </header>

                            {view === 'account' && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
                                    <div className="border-b border-slate-200 p-4 sm:p-5">
                                        <h3 className="text-sm font-semibold text-slate-900">Conta</h3>
                                    </div>
                                    <div className="space-y-4 p-4 sm:p-5">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Conta</p>
                                            <p className="mt-1 text-sm text-slate-700">{user?.email ?? 'sem-email@local'}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Password</p>
                                                    <p className="text-sm text-slate-600">Mudar a password da conta</p>
                                                </div>
                                                <Button variant="outline" className="shrink-0">Mudar</Button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {view === 'banks' && (
                                <CashflowMirrorView
                                    data={cashflowQuery.data}
                                    loading={cashflowQuery.isLoading}
                                    selectedRow={selectedCashflowRow}
                                    onSelectRow={(id) => setSelectedCashflowRowId(id)}
                                />
                            )}

                            {view === 'reconciliation' && (
                                <BankTransactionsMirrorView
                                    data={bankTransactionsQuery.data ?? []}
                                    loading={bankTransactionsQuery.isLoading}
                                    selectedIds={selectedBankIds}
                                    selectedTotal={selectedBankTotal}
                                    onToggle={(id) => {
                                        setSelectedBankIds((current) =>
                                            current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
                                        );
                                    }}
                                    onToggleAll={() => {
                                        const allIds = (bankTransactionsQuery.data ?? []).map((item) => item.id);
                                        setSelectedBankIds((current) => (current.length === allIds.length ? [] : allIds));
                                    }}
                                />
                            )}

                            {view === 'receivables' && (
                                <ExpectedMirrorView
                                    data={expectedQuery.data}
                                    loading={expectedQuery.isLoading}
                                    tab={expectedTab}
                                    onTabChange={setExpectedTab}
                                />
                            )}

                            {view === 'payables' && (
                                <BankJournalMirrorView data={bankJournalQuery.data} loading={bankJournalQuery.isLoading} />
                            )}

                            {view === 'settings' && (
                                <FinancingMirrorView data={financingQuery.data} loading={financingQuery.isLoading} />
                            )}
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}

function CashflowMirrorView(props: {
    data: CashflowMatrixResponse | undefined;
    loading: boolean;
    selectedRow: CashflowRow | null;
    onSelectRow: (id: string) => void;
}) {
    if (props.loading) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar Cashflow...</section>;
    }

    if (!props.data) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados de Cashflow.</section>;
    }

    const maxBarValue = Math.max(...props.data.chart.flatMap((point) => [point.inflow, point.outflow]), 1);
    const maxBalance = Math.max(...props.data.chart.map((point) => point.balance), 1);
    const minBalance = Math.min(...props.data.chart.map((point) => point.balance), 0);
    const span = maxBalance - minBalance || 1;

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-700">{props.data.periodLabel}</span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-700">{props.data.scenarioLabel}</span>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-700">Mock data</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[auto,1fr]">
                <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{props.data.kpi.label}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{formatCurrency(props.data.kpi.amount, props.data.kpi.currency)}</p>
                </article>

                <article className="rounded-xl border border-slate-200 p-3">
                    <div className="grid h-64 grid-cols-6 gap-2 overflow-x-auto xl:grid-cols-10">
                        {props.data.chart.map((point) => {
                            const balancePosition = ((point.balance - minBalance) / span) * 100;
                            return (
                                <div key={point.month} className="flex min-w-[86px] flex-col justify-end gap-2">
                                    <div className="relative h-full rounded-lg bg-slate-50 p-2">
                                        <div className="absolute bottom-2 left-2 right-2 flex items-end gap-1">
                                            <div className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${(point.inflow / maxBarValue) * 100}%` }} />
                                            <div className="w-1/2 rounded-t bg-rose-400" style={{ height: `${(point.outflow / maxBarValue) * 100}%` }} />
                                        </div>
                                        <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-600 ring-2 ring-white" style={{ top: `${100 - balancePosition}%` }} />
                                    </div>
                                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{point.month}</p>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold">Categoria</th>
                                {props.data.months.map((month) => (
                                    <th key={month} className="px-3 py-2 text-right font-semibold">{month}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {props.data.rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => props.onSelectRow(row.id)}
                                    className={cn('cursor-pointer border-t border-slate-100 hover:bg-slate-50', rowTone(row.kind), props.selectedRow?.id === row.id && 'ring-1 ring-blue-300')}
                                >
                                    <td className={cn('sticky left-0 px-3 py-2 font-medium bg-white', row.kind.includes('child') && 'pl-7 text-sm')}>
                                        {row.label}
                                    </td>
                                    {row.values.map((value, idx) => (
                                        <td key={`${row.id}-${idx}`} className="px-3 py-2 text-right tabular-nums text-slate-700">
                                            {formatCurrency(value)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {props.selectedRow && (
                <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">{props.selectedRow.label}</h4>
                        <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Paid</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">164 transactions - {formatCurrency(590903)}</p>
                    <ul className="mt-3 space-y-2 text-sm">
                        <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Transfer to shareholder current account 4080</span><strong className="text-emerald-700">{formatCurrency(1074)}</strong></li>
                        <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Transfer internally in cash 6213</span><strong className="text-emerald-700">{formatCurrency(1419)}</strong></li>
                        <li className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Transfer cash 4088</span><strong className="text-emerald-700">{formatCurrency(2012)}</strong></li>
                    </ul>
                </aside>
            )}
        </section>
    );
}

function BankTransactionsMirrorView(props: {
    data: BankTransaction[];
    loading: boolean;
    selectedIds: string[];
    selectedTotal: number;
    onToggle: (id: string) => void;
    onToggleAll: () => void;
}) {
    if (props.loading) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar transacoes...</section>;
    }

    const bankCards = [
        {
            id: 'bank-1',
            name: 'Millennium BCP',
            symbol: 'MB',
            iban: 'PT50 0033 0000 4551 2398 756',
            availableBalance: 214800,
            currency: 'EUR',
            lastUpdatedAt: '2026-04-15T08:22:00',
            cardTone: 'from-blue-700 via-blue-600 to-cyan-500'
        },
        {
            id: 'bank-2',
            name: 'CGD',
            symbol: 'CGD',
            iban: 'PT50 0035 0001 2387 1029 841',
            availableBalance: 198540,
            currency: 'EUR',
            lastUpdatedAt: '2026-04-15T08:18:00',
            cardTone: 'from-slate-800 via-slate-700 to-slate-500'
        },
        {
            id: 'bank-3',
            name: 'Santander',
            symbol: 'SAN',
            iban: 'PT50 0018 0000 9912 3487 221',
            availableBalance: 74000,
            currency: 'EUR',
            lastUpdatedAt: '2026-04-15T07:53:00',
            cardTone: 'from-rose-700 via-red-600 to-orange-500'
        }
    ] as const;

    return (
        <section className="grid gap-3 xl:grid-cols-[1fr,300px]">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bancos</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {bankCards.map((bank) => (
                            <article key={bank.id} className={cn('group relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-sm', bank.cardTone)}>
                                <span className="pointer-events-none absolute -right-3 -top-6 text-7xl font-black tracking-tight text-white/10">
                                    {bank.symbol}
                                </span>

                                <div className="relative flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-semibold">{bank.name}</h4>
                                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-medium">{bank.currency}</span>
                                </div>

                                <p className="relative mt-4 rounded-md bg-white/10 px-2 py-1.5 font-mono text-xs tracking-[0.08em] text-white/95 blur-[2px] transition duration-200 group-hover:blur-0 group-hover:bg-white/20">
                                    {formatIbanPreview(bank.iban)}
                                </p>

                                <div className="relative mt-4">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/80">Saldo disponivel</p>
                                    <p className="mt-1 text-xl font-bold">{formatCurrency(bank.availableBalance, bank.currency)}</p>
                                    <p className="mt-2 text-[11px] text-white/85">Ultima atualizacao: {formatDateTime(bank.lastUpdatedAt)}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search" />
                        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">Filter</button>
                    </div>
                    <Button variant="outline" className="text-xs">Manage rules</Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-3 text-left"><input type="checkbox" checked={props.selectedIds.length > 0 && props.selectedIds.length === props.data.length} onChange={props.onToggleAll} /></th>
                                <th className="px-3 py-3 text-left font-semibold">Name</th>
                                <th className="px-3 py-3 text-left font-semibold">Category</th>
                                <th className="px-3 py-3 text-left font-semibold">Payment date</th>
                                <th className="px-3 py-3 text-right font-semibold">Amount (incl. tax)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {props.data.map((row) => (
                                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-3 align-top"><input type="checkbox" checked={props.selectedIds.includes(row.id)} onChange={() => props.onToggle(row.id)} /></td>
                                    <td className="px-3 py-3 font-medium text-slate-800">{row.name}</td>
                                    <td className="px-3 py-3 text-slate-500">{row.category}</td>
                                    <td className="px-3 py-3 text-slate-600">{formatDate(row.paymentDate)}</td>
                                    <td className={cn('px-3 py-3 text-right font-semibold', row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                        {formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900">{props.selectedIds.length} selected transaction</h4>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total amount</p>
                <p className={cn('mt-1 text-4xl font-bold', props.selectedTotal >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                    {formatCurrency(props.selectedTotal)}
                </p>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions to apply on the selection</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Categorise</li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Export</li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Ignore</li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Split</li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Consider as cash inflow</li>
                    <li className="rounded-lg border border-slate-200 px-3 py-2">Display advanced options</li>
                </ul>
            </aside>
        </section>
    );
}

function ExpectedMirrorView(props: {
    data: ExpectedPositioningResponse | undefined;
    loading: boolean;
    tab: 'balance' | 'table' | 'calendar';
    onTabChange: (tab: 'balance' | 'table' | 'calendar') => void;
}) {
    if (props.loading) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar Cash positioning...</section>;
    }

    if (!props.data) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados de Expected.</section>;
    }

    const data = props.data;
    const max = Math.max(...data.chart.map((p) => p.balance), 1);
    const min = Math.min(...data.chart.map((p) => p.balance), 0);
    const span = max - min || 1;
    const points = data.chart
        .map((point, idx) => {
            const x = (idx / Math.max(data.chart.length - 1, 1)) * 100;
            const y = 100 - ((point.balance - min) / span) * 100;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">{data.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{data.periodLabel} - {data.accountsLabel} - {data.expectedLabel}</p>
                </div>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">Automatic balancing</Button>
            </div>

            <article className="rounded-xl border border-slate-200 p-4">
                <svg viewBox="0 0 100 100" className="h-56 w-full rounded-lg bg-slate-50">
                    <polyline points={`0,100 ${points} 100,100`} fill="rgba(59,130,246,0.12)" stroke="none" />
                    <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.2" />
                    <line x1="0" y1="95" x2="100" y2="95" stroke="#dc2626" strokeWidth="0.8" strokeDasharray="2 2" />
                </svg>
            </article>

            <div className="flex flex-wrap gap-2 text-sm">
                <button onClick={() => props.onTabChange('balance')} className={cn('rounded-lg px-3 py-2', props.tab === 'balance' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>Balance summary</button>
                <button onClick={() => props.onTabChange('table')} className={cn('rounded-lg px-3 py-2', props.tab === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>Cash flow table</button>
                <button onClick={() => props.onTabChange('calendar')} className={cn('rounded-lg px-3 py-2', props.tab === 'calendar' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>Transaction calendar</button>
            </div>

            {props.tab !== 'calendar' && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-[920px] w-full text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold">Categoria</th>
                                    {data.weeks.map((week) => (
                                        <th key={week} className="px-3 py-2 text-right font-semibold">{week}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(props.tab === 'balance' ? data.balanceSummaryRows : data.cashflowRows).map((row) => (
                                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">{row.label}</td>
                                        {row.values.map((value, idx) => (
                                            <td key={`${row.id}-${idx}`} className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCurrency(value)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {props.tab === 'calendar' && (
                <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Cash available" value={data.calendarKpis.cashAvailable} tone="neutral" />
                        <KpiCard label="Cash inflow" value={data.calendarKpis.cashInflow} tone="positive" />
                        <KpiCard label="Cash outflow" value={data.calendarKpis.cashOutflow} tone="negative" />
                        <KpiCard label="Closing balance" value={data.calendarKpis.closingBalance} tone="neutral" />
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                            Today - {data.calendarDayLabel}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-[860px] w-full text-sm">
                                <thead className="bg-white text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                                        <th className="px-3 py-2 text-left font-semibold">Category</th>
                                        <th className="px-3 py-2 text-left font-semibold">Bank account</th>
                                        <th className="px-3 py-2 text-right font-semibold">Amount incl. taxes</th>
                                        <th className="px-3 py-2 text-right font-semibold">Cumulative cashflow</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.calendarTransactions.map((tx) => (
                                        <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-3 font-medium text-slate-800">{tx.name}</td>
                                            <td className="px-3 py-3 text-slate-600">{tx.category}</td>
                                            <td className="px-3 py-3 text-slate-600">{tx.bankAccount}</td>
                                            <td className={cn('px-3 py-3 text-right font-semibold', tx.amountInclTaxes >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                                                {formatCurrency(tx.amountInclTaxes)}
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatCurrency(tx.cumulativeCashflow)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function KpiCard(props: { label: string; value: number; tone: 'positive' | 'negative' | 'neutral' }) {
    return (
        <article className={cn('rounded-xl border p-3', props.tone === 'positive' && 'border-emerald-200 bg-emerald-50', props.tone === 'negative' && 'border-rose-200 bg-rose-50', props.tone === 'neutral' && 'border-slate-200 bg-slate-50')}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
            <p className={cn('mt-1 text-lg font-semibold', props.tone === 'positive' && 'text-emerald-700', props.tone === 'negative' && 'text-rose-700', props.tone === 'neutral' && 'text-slate-800')}>
                {formatCurrency(props.value)}
            </p>
        </article>
    );
}

function BankJournalMirrorView(props: { data: BankJournalResponse | undefined; loading: boolean }) {
    if (props.loading) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar Bank journal...</section>;
    }

    if (!props.data) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados de Bank journal.</section>;
    }

    const data = props.data;

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">{data.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{data.periodLabel}</p>
                </div>
                <button className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">Filter by date</button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total entries" value={data.kpis.entries} tone="neutral" />
                <KpiCard label="Total debits" value={data.kpis.debitTotal} tone="negative" />
                <KpiCard label="Total credits" value={data.kpis.creditTotal} tone="positive" />
                <KpiCard label="Net balance" value={data.kpis.netBalance} tone={data.kpis.netBalance >= 0 ? 'positive' : 'negative'} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold">Date</th>
                                <th className="px-3 py-2 text-left font-semibold">Description</th>
                                <th className="px-3 py-2 text-right font-semibold">Debit</th>
                                <th className="px-3 py-2 text-right font-semibold">Credit</th>
                                <th className="px-3 py-2 text-right font-semibold">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.summaryRows.map((row) => (
                                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-3 font-medium text-slate-700">{formatDate(row.date)}</td>
                                    <td className="px-3 py-3 text-slate-700">{row.description}</td>
                                    <td className={cn('px-3 py-3 text-right font-semibold', row.debit > 0 ? 'text-rose-700' : 'text-slate-400')}>
                                        {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                                    </td>
                                    <td className={cn('px-3 py-3 text-right font-semibold', row.credit > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                                        {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatCurrency(row.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filter applied</p>
                <p className="mt-1 text-sm text-slate-700">{data.filters.journalType} • {data.filters.account}</p>
                <p className="mt-1 text-xs text-slate-500">Period: {data.filters.dateRange.from} to {data.filters.dateRange.to}</p>
            </div>
        </section>
    );
}

function FinancingMirrorView(props: { data: FinancingResponse | undefined; loading: boolean }) {
    if (props.loading) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">A carregar Financing...</section>;
    }

    if (!props.data) {
        return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Sem dados de Financing.</section>;
    }

    const data = props.data;

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
                <h3 className="text-2xl font-bold text-slate-900">{data.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{data.periodLabel}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                <KpiCard label="Total outstanding" value={data.totalOutstanding} tone="negative" />
                <KpiCard label="Total scheduled" value={data.totalScheduled} tone="neutral" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-900">Active loans</h4>
                <div className="mt-3 space-y-2">
                    {data.activeLoans.map((loan) => (
                        <div key={loan.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{loan.provider}</p>
                                <p className="text-xs text-slate-500">{loan.rate} • {formatDate(loan.maturityDate)} maturity</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{formatCurrency(loan.outstandingBalance)}</p>
                                <p className="text-xs text-slate-500">{loan.monthlyPayment.toFixed(2)}/month</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-900">Lines of credit</h4>
                <div className="mt-3 space-y-2">
                    {data.linesOfCredit.map((loc) => (
                        <div key={loc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{loc.provider}</p>
                                <p className="text-xs text-slate-500">{loc.rate}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{formatCurrency(loc.availableBalance)}/{formatCurrency(loc.limit)}</p>
                                <p className="text-xs text-slate-500 font-medium">{((loc.utilization / loc.limit) * 100).toFixed(0)}% used</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">Upcoming payments</div>
                <div className="overflow-x-auto">
                    <table className="min-w-[700px] w-full text-sm">
                        <thead className="bg-white text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold">Date</th>
                                <th className="px-3 py-2 text-left font-semibold">Provider</th>
                                <th className="px-3 py-2 text-left font-semibold">Type</th>
                                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.upcomingPayments.map((payment) => (
                                <tr key={payment.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-3 font-medium text-slate-800">{formatDate(payment.date)}</td>
                                    <td className="px-3 py-3 text-slate-700">{payment.provider}</td>
                                    <td className="px-3 py-3 text-slate-600 text-xs">{payment.type}</td>
                                    <td className="px-3 py-3 text-right font-semibold text-rose-700">{formatCurrency(payment.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
