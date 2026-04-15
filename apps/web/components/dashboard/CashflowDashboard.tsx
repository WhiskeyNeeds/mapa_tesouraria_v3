'use client';

import { useMemo, useState } from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {
    ChevronDown,
    ChevronRight,
    CircleAlert,
    Lock,
    Menu,
    MoreHorizontal,
    PlusSquare,
    RefreshCw,
    Search
} from 'lucide-react';

type RowNode = {
    id: string;
    label: string;
    values: number[];
    children?: RowNode[];
};

type MonthDef = {
    key: string;
    label: string;
};

type CashflowDataset = {
    period: { from: string; to: string };
    months: MonthDef[];
    series: {
        inflow: number[];
        outflow: number[];
        trend: number[];
    };
    rows: RowNode[];
};

export const cashflowMockData: CashflowDataset = {
    period: { from: '2026-01', to: '2027-04' },
    months: [
        { key: '2026-01', label: 'Jan 26' },
        { key: '2026-02', label: 'Fev 26' },
        { key: '2026-03', label: 'Mar 26' },
        { key: '2026-04', label: 'Abr 26' },
        { key: '2026-05', label: 'Mai 26' },
        { key: '2026-06', label: 'Jun 26' },
        { key: '2026-07', label: 'Jul 26' },
        { key: '2026-08', label: 'Ago 26' },
        { key: '2026-09', label: 'Set 26' },
        { key: '2026-10', label: 'Out 26' },
        { key: '2026-11', label: 'Nov 26' },
        { key: '2026-12', label: 'Dez 26' },
        { key: '2027-01', label: 'Jan 27' },
        { key: '2027-02', label: 'Fev 27' },
        { key: '2027-03', label: 'Mar 27' },
        { key: '2027-04', label: 'Abr 27' }
    ],
    series: {
        inflow: [3096747, 3132305, 1026588, 3102049, 3182803, 3238282, 2936562, 3059774, 3183948, 2860515, 2955749, 3250204, 2947504, 0, 0, 0],
        outflow: [2704769, 3047605, 1115894, 2984092, 3146040, 3479130, 2779880, 3277555, 3686544, 2691861, 3065162, 3688804, 2546928, 0, 0, 0],
        trend: [551843, 943821, 1028521, 939215, 1057172, 1093935, 853087, 1009769, 791988, 289392, 458046, 348634, -89966, 310609, 310609, 310609]
    },
    rows: [
        {
            id: 'cash-balance',
            label: 'Saldo de caixa no início do mês',
            values: [551843, 943821, 1028521, 939215, 1057172, 1093935, 853087, 1009769, 791988, 289392, 458046, 348634, -89966, 310609, 310609, 310609]
        },
        {
            id: 'cash-inflow',
            label: 'Entradas de caixa',
            values: [3096747, 3132305, 1026588, 3102049, 3182803, 3238282, 2936562, 3059774, 3183948, 2860515, 2955749, 3250204, 2947504, 0, 0, 0],
            children: [
                {
                    id: 'operating-inflows',
                    label: 'Entradas operacionais',
                    values: [2943217, 2941048, 898931, 2903000, 2721477, 2860538, 2788713, 2611188, 2822824, 2724470, 2544946, 2882650, 2814520, 0, 0, 0],
                    children: [
                        {
                            id: 'customer-inflows',
                            label: 'Entradas de clientes',
                            values: [2699763, 2542116, 779441, 2672765, 2338747, 2600005, 2565855, 2245197, 2574005, 2514538, 2200293, 2620712, 2594296, 0, 0, 0]
                        },
                        {
                            id: 'invoice-financing',
                            label: 'Financiamento de faturas',
                            values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                        }
                    ]
                },
                {
                    id: 'other-inflows',
                    label: 'Outras entradas operacionais',
                    values: [107064, 214376, 61395, 103392, 203711, 131272, 102358, 197713, 126021, 96662, 186472, 136819, 101948, 0, 0, 0]
                }
            ]
        },
        {
            id: 'cash-outflow',
            label: 'Saídas de caixa',
            values: [2704769, 3047605, 1115894, 2984092, 3146040, 3479130, 2779880, 3277555, 3686544, 2691861, 3065162, 3688804, 2546928, 0, 0, 0],
            children: [
                {
                    id: 'operating-outflows',
                    label: 'Saídas operacionais',
                    values: [2150567, 2409985, 718911, 2418860, 2601304, 3037079, 2270225, 2717056, 3237967, 2203985, 2539853, 3271236, 2103264, 0, 0, 0],
                    children: [
                        {
                            id: 'cogs-outflows',
                            label: 'Saídas de CMVMC',
                            values: [454473, 533603, 253837, 664129, 549718, 571884, 471470, 577204, 589041, 457326, 542571, 753371, 425505, 0, 0, 0]
                        },
                        {
                            id: 'staff-expenses',
                            label: 'Despesas com pessoal',
                            values: [1567607, 1690388, 356609, 1611999, 1862742, 2298639, 1662286, 1947177, 2475674, 1617108, 1812650, 2352797, 1558132, 0, 0, 0]
                        }
                    ]
                },
                {
                    id: 'finance-outflows',
                    label: 'Saídas de financiamento',
                    values: [406226, 447027, 278322, 412777, 370700, 358600, 380603, 395164, 368375, 360435, 372612, 341568, 321378, 0, 0, 0]
                }
            ]
        },
        {
            id: 'end-balance',
            label: 'Saldo de caixa no fim do mês',
            values: [943821, 1028521, 939215, 1057172, 1093935, 853087, 1009769, 791988, 289392, 458046, 348634, -89966, 310609, 310609, 310609, 310609]
        }
    ]
};

export const cashflowMockJson = JSON.stringify(cashflowMockData, null, 2);

const toCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(value);

const firstColumnWidth = 260;
const monthColumnWidth = 105;
const highlightedMonthIndex = 3;

function flattenRows(rows: RowNode[], expanded: Set<string>, depth = 0): Array<RowNode & { depth: number; hasChildren: boolean }> {
    const output: Array<RowNode & { depth: number; hasChildren: boolean }> = [];

    for (const row of rows) {
        const hasChildren = Boolean(row.children?.length);
        output.push({ ...row, depth, hasChildren });

        if (hasChildren && expanded.has(row.id)) {
            output.push(...flattenRows(row.children ?? [], expanded, depth + 1));
        }
    }

    return output;
}

export function CashflowDashboard() {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(
        new Set(['cash-inflow', 'cash-outflow', 'operating-inflows', 'operating-outflows'])
    );

    const chartData = useMemo(
        () =>
            cashflowMockData.months.map((month, index) => ({
                month: month.label,
                inflow: cashflowMockData.series.inflow[index],
                outflow: cashflowMockData.series.outflow[index],
                trend: cashflowMockData.series.trend[index]
            })),
        []
    );

    const visibleRows = useMemo(
        () => flattenRows(cashflowMockData.rows, expandedRows),
        [expandedRows]
    );

    const gridWidth = firstColumnWidth + cashflowMockData.months.length * monthColumnWidth;

    const toggleRow = (id: string) => {
        setExpandedRows((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <section className="overflow-hidden rounded-xl border border-slate-300 bg-[#f3f4f6] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#d6d9df] bg-[#efe4d8] px-4 py-2 text-sm">
                <div className="flex items-center gap-2 font-semibold text-[#b9672d]">
                    <CircleAlert className="h-4 w-4" />
                    Dados simulados
                </div>
                <button className="rounded border border-[#e7a577] bg-[#fff4eb] px-3 py-1 text-xs font-semibold text-[#d36f2c] hover:bg-[#ffe7d7]">
                    Eliminar dados simulados
                </button>
            </div>

            <div className="flex items-center justify-between border-b border-[#d6d9df] bg-white px-4 py-2.5 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-3">
                    <button className="rounded bg-[#dbeafe] px-3 py-1 font-semibold text-[#2563eb]">Fluxo de caixa</button>
                    <button>Banco</button>
                    <button>Previsto</button>
                    <button>Diário bancário</button>
                    <button>Financiamento</button>
                    <button>Painéis</button>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                    <PlusSquare className="h-4 w-4" />
                    <Search className="h-4 w-4" />
                    <Lock className="h-4 w-4" />
                    <Menu className="h-4 w-4" />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d6d9df] bg-[#f7f8fa] px-4 py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button className="rounded border border-[#ccd2db] bg-white px-3 py-1.5 font-medium text-slate-600">Jan 2026 - Jun 2027</button>
                    <button className="rounded border border-[#ccd2db] bg-white px-3 py-1.5 font-medium text-slate-600">Cenário principal</button>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <button className="rounded border border-[#ccd2db] bg-white p-1.5"><RefreshCw className="h-4 w-4" /></button>
                    <button className="rounded border border-[#ccd2db] bg-white p-1.5"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar">
                <div className="min-w-full" style={{ width: gridWidth }}>
                    <div className="flex border-b border-[#d6d9df] bg-[#f3f4f6]">
                        <div className="shrink-0 border-r border-[#d6d9df] px-4 py-3" style={{ width: firstColumnWidth }}>
                            <div className="rounded-md bg-[#e2e8f0] p-3">
                                <p className="text-3xl font-bold text-[#16a34a]">+€939,215</p>
                                <p className="text-xs font-semibold text-[#2563eb]">Saldo de caixa</p>
                            </div>
                        </div>

                        <div className="shrink-0 px-2 py-2" style={{ width: cashflowMockData.months.length * monthColumnWidth }}>
                            <div className="h-[290px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                                        <defs>
                                            <pattern id="greenPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                                <rect width="6" height="6" fill="#a7f3d0" />
                                                <rect width="2" height="6" fill="#34d399" />
                                            </pattern>
                                            <pattern id="redPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                                <rect width="6" height="6" fill="#fecaca" />
                                                <rect width="2" height="6" fill="#f87171" />
                                            </pattern>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#d1d5db" />
                                        <ReferenceArea x1={chartData[highlightedMonthIndex].month} x2={chartData[highlightedMonthIndex].month} fill="#bfdbfe" fillOpacity={0.55} />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}M`} />
                                        <Tooltip formatter={(value) => toCurrency(Number(value))} />
                                        <Bar dataKey="inflow" fill="url(#greenPattern)" radius={[2, 2, 0, 0]} barSize={14} />
                                        <Bar dataKey="outflow" fill="url(#redPattern)" radius={[2, 2, 0, 0]} barSize={14} />
                                        <Line dataKey="trend" type="monotone" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <table className="table-fixed border-collapse text-sm" style={{ width: gridWidth }}>
                        <colgroup>
                            <col style={{ width: firstColumnWidth }} />
                            {cashflowMockData.months.map((month) => (
                                <col key={month.key} style={{ width: monthColumnWidth }} />
                            ))}
                        </colgroup>
                        <thead>
                            <tr className="bg-[#eceff3] text-xs uppercase text-slate-500">
                                <th className="sticky left-0 z-20 border-b border-r border-[#d6d9df] bg-[#eceff3] px-3 py-3 text-left font-semibold tracking-[0.08em]">
                                    <div className="rounded border border-[#cfd5df] bg-white px-2 py-1 text-xs font-normal text-slate-400">Pesquisar categoria...</div>
                                </th>
                                {cashflowMockData.months.map((month, index) => (
                                    <th
                                        key={month.key}
                                        className={`border-b border-[#d6d9df] px-2 py-3 text-right font-semibold tracking-[0.08em] ${index === highlightedMonthIndex ? 'bg-[#dbeafe] text-[#2563eb]' : ''}`}
                                    >
                                        {month.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => (
                                <tr key={row.id} className="border-b border-[#d6d9df] text-[13px] hover:bg-[#eef2f7]">
                                    <td className="sticky left-0 z-10 border-r border-[#d6d9df] bg-[#f3f4f6] px-2 py-1.5">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left"
                                            onClick={() => row.hasChildren && toggleRow(row.id)}
                                        >
                                            <span style={{ width: row.depth * 14 }} />
                                            {row.hasChildren ? (
                                                expandedRows.has(row.id) ? (
                                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                                )
                                            ) : (
                                                <span className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                            <span className="font-medium text-slate-700">{row.label}</span>
                                        </button>
                                    </td>
                                    {row.values.map((value, index) => (
                                        <td
                                            key={`${row.id}-${cashflowMockData.months[index].key}`}
                                            className={`px-2 py-1.5 text-right font-mono text-[12px] ${index === highlightedMonthIndex ? 'bg-[#dbeafe]/70 font-semibold text-slate-700' : 'text-slate-600'}`}
                                        >
                                            {Math.abs(value) > 0 ? new Intl.NumberFormat('pt-PT').format(value) : '0'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
