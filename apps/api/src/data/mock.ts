export const dashboardData = {
    kpis: {
        saldoTotal: 487340,
        caixaDisponivel: 312100,
        aReceber: 184520,
        aPagar: 97240
    },
    alertas: [
        { tipo: 'critico', titulo: '5 faturas vencidas', detalhe: '47.200 EUR em atraso' },
        { tipo: 'aviso', titulo: 'Pagamento IRS em 3 dias', detalhe: '12.400 EUR' },
        { tipo: 'info', titulo: '12 movimentos por classificar', detalhe: 'Ultima importacao hoje 08:22' }
    ]
};

export const bankAccounts = [
    {
        id: 'acc-1',
        nome: 'Millennium BCP',
        iban: 'PT50 0035 1234 5678 9012 3456 8756',
        saldo: 214800,
        moeda: 'EUR',
        ultimaAtualizacao: '2026-04-14T08:22:00'
    },
    {
        id: 'acc-2',
        nome: 'CGD Principal',
        iban: 'PT50 0035 2234 5678 9012 4567 9841',
        saldo: 198540,
        moeda: 'EUR',
        ultimaAtualizacao: '2026-04-14T08:18:00'
    },
    {
        id: 'acc-3',
        nome: 'Santander Negocios',
        iban: 'PT50 0035 3234 5678 9012 6789 7221',
        saldo: 74000,
        moeda: 'EUR',
        ultimaAtualizacao: '2026-04-14T08:10:00'
    }
];

export const bankMovements = [
    { id: 'mov-1', data: '2026-04-10', descricao: 'TRF SONAE INDUSTRIA SA', valor: 18500, estado: 'por_classificar' },
    { id: 'mov-2', data: '2026-04-09', descricao: 'PAG NOS COMUNICACOES', valor: -3200, estado: 'reconciliado' },
    { id: 'mov-3', data: '2026-04-08', descricao: 'SALARIOS MARCO 2026', valor: -48000, estado: 'reconciliado' }
];

export const receivables = [
    { id: 'ar-1', referencia: 'FAC 2026/A/0188', entidade: 'Sonae Industria SA', valor: 18500, pendente: 18500, origem: 'TOCONLINE', estado: 'a_receber' },
    { id: 'ar-2', referencia: 'LOC-2026/03', entidade: 'Subaluguer espaco', valor: 1200, pendente: 1200, origem: 'LOCAL', estado: 'a_receber' }
];

export const payables = [
    { id: 'ap-1', referencia: 'FC 78234', entidade: 'NOS Comunicacoes', valor: 3200, pendente: 3200, origem: 'TOCONLINE', estado: 'por_pagar' },
    { id: 'ap-2', referencia: 'LOC-SAL/04', entidade: 'Salarios equipa', valor: 48000, pendente: 48000, origem: 'LOCAL', estado: 'por_pagar' }
];

export const categories = [
    { id: 'cat-1', nome: 'Vendas produtos', tipo: 'RECEITA', lancaToconline: true },
    { id: 'cat-2', nome: 'Compras materiais', tipo: 'DESPESA', lancaToconline: true },
    { id: 'cat-3', nome: 'Recursos Humanos (Salarios)', tipo: 'DESPESA', lancaToconline: false },
    { id: 'cat-4', nome: 'Instalacoes (Rendas)', tipo: 'DESPESA', lancaToconline: false }
];

export const cashflowMirror = {
    periodLabel: 'Jan 2022 -> Jun 2028',
    scenarioLabel: 'Main scenario',
    kpi: {
        label: 'Cash balance',
        amount: 939215,
        currency: 'EUR'
    },
    months: ['NOV 25', 'DEC 25', 'JAN 26', 'FEB 26', 'MAR 26', 'APR 26', 'MAY 26', 'JUN 26', 'JUL 26', 'AUG 26', 'SEPT 26', 'OCT 26', 'NOV 26', 'DEC 26', 'JAN 27'],
    chart: [
        { month: 'NOV 25', inflow: 0, outflow: 0, balance: 0 },
        { month: 'DEC 25', inflow: 3802551, outflow: 3250708, balance: 551843 },
        { month: 'JAN 26', inflow: 3096747, outflow: 2704769, balance: 943821 },
        { month: 'FEB 26', inflow: 3132305, outflow: 3047605, balance: 1028521 },
        { month: 'MAR 26', inflow: 1026588, outflow: 1115894, balance: 939215 },
        { month: 'APR 26', inflow: 3102049, outflow: 2984092, balance: 1057172 },
        { month: 'MAY 26', inflow: 3182803, outflow: 3146040, balance: 1093935 },
        { month: 'JUN 26', inflow: 3238282, outflow: 3479130, balance: 853087 },
        { month: 'JUL 26', inflow: 2936562, outflow: 2779880, balance: 1009769 },
        { month: 'AUG 26', inflow: 3059774, outflow: 3277555, balance: 791988 },
        { month: 'SEPT 26', inflow: 3183948, outflow: 3686544, balance: 289392 },
        { month: 'OCT 26', inflow: 2860515, outflow: 2691861, balance: 458046 },
        { month: 'NOV 26', inflow: 2955749, outflow: 3065162, balance: 348634 },
        { month: 'DEC 26', inflow: 3250204, outflow: 3688804, balance: -89966 },
        { month: 'JAN 27', inflow: 2947504, outflow: 2546928, balance: 310609 }
    ],
    rows: [
        { id: 'r-1', label: 'Cash balance at beginning of the month', kind: 'summary', values: [0, 0, 551843, 943821, 1028521, 939215, 1057172, 1093935, 853087, 1009769, 791988, 289392, 458046, 348634, -89966] },
        { id: 'r-2', label: 'Cash inflow', kind: 'inflow', values: [0, 3802551, 3096747, 3132305, 1026588, 3102049, 3182803, 3238282, 2936562, 3059774, 3183948, 2860515, 2955749, 3250204, 2947504] },
        { id: 'r-3', label: 'Operating inflows', kind: 'inflow-child', values: [0, 3103095, 2943217, 2941048, 898931, 2903000, 2721477, 2860538, 2788713, 2611188, 2822824, 2724470, 2544946, 2882650, 2814520] },
        { id: 'r-4', label: 'Investment inflows', kind: 'inflow-child', values: [0, 311463, 70306, 112072, 87156, 79362, 109399, 287109, 64614, 107211, 274932, 59774, 152697, 76000, 122287] },
        { id: 'r-5', label: 'Financing inflows', kind: 'inflow-child', values: [0, 387993, 83224, 79185, 40501, 119687, 351928, 90635, 83235, 341374, 86192, 76271, 0, 0, 103901] },
        { id: 'r-6', label: 'Cash outflow', kind: 'outflow', values: [0, 3250708, 2704769, 3047605, 1115894, 2984092, 3146040, 3479130, 2779880, 3277555, 3686544, 2691861, 3065162, 3688804, 2546928] },
        { id: 'r-7', label: 'Operating outflows', kind: 'outflow-child', values: [0, 2723272, 2150567, 2409985, 718911, 2418860, 2601304, 3037079, 2270225, 2717056, 3237967, 2203985, 2539853, 3271236, 2103264] },
        { id: 'r-8', label: 'Investment outflows', kind: 'outflow-child', values: [0, 91711, 147976, 190593, 118661, 152456, 174036, 83452, 129052, 165334, 80202, 127441, 152697, 76000, 122287] },
        { id: 'r-9', label: 'Financing outflows', kind: 'outflow-child', values: [0, 435725, 406226, 447027, 278322, 412777, 370700, 358600, 380603, 395164, 368375, 360435, 372612, 341568, 321378] },
        { id: 'r-10', label: 'End of month cash balance', kind: 'summary', values: [0, 551843, 943821, 1028521, 939215, 1057172, 1093935, 853087, 1009769, 791988, 289392, 458046, 348634, -89966, 310609] }
    ]
};

export const bankTransactions = [
    { id: 'bt-1', name: 'Electronic Hansen & Sohne Inc. - Transfer - Electronics Service', category: 'COGS outflows', paymentDate: '2026-03-06', amount: -1234 },
    { id: 'bt-2', name: 'Dividends paid 8804', category: 'Paid dividends', paymentDate: '2026-03-06', amount: -1356 },
    { id: 'bt-3', name: 'Cash transfers internally 2301', category: 'Intracompany cash transfers', paymentDate: '2026-03-06', amount: -1792 },
    { id: 'bt-4', name: 'Deposit 3829', category: 'Deposits', paymentDate: '2026-03-05', amount: 1044 },
    { id: 'bt-5', name: 'Transfer to shareholder current account 4080', category: 'Intracompany cash transfers', paymentDate: '2026-03-05', amount: 1074 },
    { id: 'bt-6', name: 'Redeeming the deposit in 1961', category: 'Deposits', paymentDate: '2026-03-05', amount: 1156 },
    { id: 'bt-7', name: 'Redeeming deposit 1045', category: 'Deposits', paymentDate: '2026-03-05', amount: 1248 },
    { id: 'bt-8', name: 'Redeeming deposit 4048', category: 'Deposits', paymentDate: '2026-03-05', amount: 1294 },
    { id: 'bt-9', name: 'Entrance subsidy 1674', category: 'Subsidies', paymentDate: '2026-03-05', amount: 1357 }
];

export const expectedPositioning = {
    title: 'Cash positioning',
    periodLabel: 'W 12 - 16/03 -> W 29 - 19/07',
    dateRangeLabel: '15 Apr 2026 - 15 May 2026',
    accountsLabel: 'All accounts',
    expectedLabel: 'All expected',
    chart: [
        { date: '2026-03-16', balance: 939215 },
        { date: '2026-04-13', balance: 2205463.75 },
        { date: '2026-04-20', balance: 2170461.21 },
        { date: '2026-04-27', balance: 2120069.6 },
        { date: '2026-05-04', balance: 2120069.6 },
        { date: '2026-05-11', balance: 1899807.06 },
        { date: '2026-05-18', balance: 1898694.93 },
        { date: '2026-05-25', balance: 1898694.93 }
    ],
    weeks: ['W 15 - 06/04', 'W 16 - 13/04', 'W 17 - 20/04', 'W 18 - 27/04', 'W 19 - 04/05', 'W 20 - 11/05', 'W 21 - 18/05', 'W 22 - 25/05'],
    balanceSummaryRows: [
        { id: 'bs-1', label: 'Total Closing Balance', values: [939215, 2205463.75, 2170461.21, 2120069.6, 2120069.6, 1899807.06, 1898694.93, 1898694.93] },
        { id: 'bs-2', label: 'Account type: undefined', values: [939215, 2205463.75, 2170461.21, 2120069.6, 2120069.6, 1899807.06, 1898694.93, 1898694.93] }
    ],
    cashflowRows: [
        { id: 'cf-1', label: 'Opening balance', values: [939215, 939215, 2205463.75, 2170461.21, 2120069.6, 2120069.6, 1899807.06, 1898694.93] },
        { id: 'cf-2', label: 'Inflows', values: [0, 2906766.21, 15710.91, 0, 0, 0, 0, 0] },
        { id: 'cf-3', label: 'Operating inflows', values: [0, 2733120.16, 15710.91, 0, 0, 0, 0, 0] },
        { id: 'cf-4', label: 'Outflows', values: [0, -1640518.96, -50215.06, -45391.61, -220262.54, -1112.13, 0, 0] }
    ],
    calendarKpis: {
        cashAvailable: 939215,
        cashInflow: 2748374.63,
        cashOutflow: -1613730,
        closingBalance: 2073816.54
    },
    calendarDayLabel: 'Wednesday 15/04',
    calendarTransactions: [
        { id: 'ct-1', name: 'VIR INTL RECEIVED AZ BOOST FOR: TRANSCOM INDUSTRY REF: 2240', category: 'Customer inflows', bankAccount: 'Fictive bank account', amountInclTaxes: 120907.36, cumulativeCashflow: 1060122.36 },
        { id: 'ct-2', name: 'TRANSFER RECEIVED ADER 6292', category: 'Customer inflows', bankAccount: 'Fictive bank account', amountInclTaxes: 104183.2, cumulativeCashflow: 1164305.56 },
        { id: 'ct-3', name: 'VIR RECEIVED S.A.S. TRANSFER BOULOT 7589', category: 'Customer inflows', bankAccount: 'Fictive bank account', amountInclTaxes: 80510.81, cumulativeCashflow: 1244816.37 },
        { id: 'ct-4', name: 'VIR INTL RECEIVED AZ BOOST FOR: TRANSCOM INDUSTRY REF: 1018', category: 'Customer inflows', bankAccount: 'Fictive bank account', amountInclTaxes: 54674.58, cumulativeCashflow: 1299490.95 },
        { id: 'ct-5', name: 'TRANSFER RECEIVED DFT 6595 OPEZD SAS SECTION 2', category: 'Customer inflows', bankAccount: 'Fictive bank account', amountInclTaxes: 54548.37, cumulativeCashflow: 1354039.32 }
    ]
};

export const bankJournal = {
    title: 'Bank journal',
    periodLabel: '01 Jan 2026 - 14 Apr 2026',
    kpis: {
        entries: 248,
        debitTotal: 1856420.50,
        creditTotal: 2094180.75,
        netBalance: 237760.25
    },
    summaryRows: [
        { id: 'j-1', date: '2026-04-14', description: 'Opening balance', debit: 0, credit: 0, balance: 939215 },
        { id: 'j-2', date: '2026-04-10', description: 'Customer transfer - Sonae Industria', debit: 0, credit: 18500, balance: 957715 },
        { id: 'j-3', date: '2026-04-09', description: 'Supplier payment - NOS', debit: 3200, credit: 0, balance: 954515 },
        { id: 'j-4', date: '2026-04-08', description: 'Payroll - March 2026', debit: 48000, credit: 0, balance: 906515 },
        { id: 'j-5', date: '2026-04-07', description: 'Utilities - EDP', debit: 1840, credit: 0, balance: 904675 },
        { id: 'j-6', date: '2026-04-06', description: 'Customer transfer - JM', debit: 0, credit: 24300, balance: 928975 },
        { id: 'j-7', date: '2026-04-05', description: 'Tax payment - IRS Q1', debit: 12400, credit: 0, balance: 916575 },
        { id: 'j-8', date: '2026-04-04', description: 'Rent - Monthly', debit: 4500, credit: 0, balance: 912075 },
        { id: 'j-9', date: '2026-04-03', description: 'Supplier transfer - Acme Tools', debit: 8340, credit: 0, balance: 903735 },
        { id: 'j-10', date: '2026-04-02', description: 'Bank fee - Monthly', debit: 85, credit: 0, balance: 903650 }
    ],
    filters: {
        dateRange: { from: '2026-01-01', to: '2026-04-14' },
        journalType: 'BANK',
        account: 'Millennium BCP ...756'
    }
};

export const financingData = {
    title: 'Financing',
    periodLabel: '2026',
    totalOutstanding: 425000,
    totalScheduled: 1200000,
    activeLoans: [
        {
            id: 'fin-1',
            provider: 'Millennium BCP',
            amount: 250000,
            currency: 'EUR',
            startDate: '2023-06-15',
            maturityDate: '2028-06-15',
            rate: '2.5% fixed',
            monthlyPayment: 4361.78,
            outstandingBalance: 185000,
            status: 'ACTIVE',
            nextPaymentDate: '2026-05-15',
            nextPaymentAmount: 4361.78
        },
        {
            id: 'fin-2',
            provider: 'CGD',
            amount: 150000,
            currency: 'EUR',
            startDate: '2024-03-01',
            maturityDate: '2029-03-01',
            rate: '2.75% fixed',
            monthlyPayment: 2812.50,
            outstandingBalance: 135000,
            status: 'ACTIVE',
            nextPaymentDate: '2026-05-01',
            nextPaymentAmount: 2812.50
        },
        {
            id: 'fin-3',
            provider: 'Santander',
            amount: 200000,
            currency: 'EUR',
            startDate: '2025-01-10',
            maturityDate: '2030-01-10',
            rate: '2.9% fixed',
            monthlyPayment: 3765.43,
            outstandingBalance: 190000,
            status: 'ACTIVE',
            nextPaymentDate: '2026-05-10',
            nextPaymentAmount: 3765.43
        }
    ],
    linesOfCredit: [
        {
            id: 'loc-1',
            provider: 'Millennium BCP',
            limit: 500000,
            utilization: 180000,
            availableBalance: 320000,
            rate: 'EURIBOR 3M + 1.25%',
            status: 'ACTIVE'
        },
        {
            id: 'loc-2',
            provider: 'CGD',
            limit: 200000,
            utilization: 85000,
            availableBalance: 115000,
            rate: 'EURIBOR 3M + 1.50%',
            status: 'ACTIVE'
        }
    ],
    upcomingPayments: [
        { id: 'up-1', date: '2026-04-15', provider: 'Millennium BCP', amount: 4361.78, type: 'Loan payment' },
        { id: 'up-2', date: '2026-04-30', provider: 'CGD', amount: 2812.50, type: 'Loan payment' },
        { id: 'up-3', date: '2026-05-10', provider: 'Santander', amount: 3765.43, type: 'Loan payment' },
        { id: 'up-4', date: '2026-05-15', provider: 'Millennium BCP', amount: 3200, type: 'Interest only' }
    ],
    scheduleChart: [
        { month: 'APR 26', payments: 4361.78, principal: 2500, interest: 1861.78 },
        { month: 'MAY 26', payments: 10939.71, principal: 6250, interest: 4689.71 },
        { month: 'JUN 26', payments: 10939.71, principal: 6250, interest: 4689.71 },
        { month: 'JUL 26', payments: 10939.71, principal: 6250, interest: 4689.71 },
        { month: 'AUG 26', payments: 10939.71, principal: 6250, interest: 4689.71 },
        { month: 'SEP 26', payments: 10939.71, principal: 6250, interest: 4689.71 }
    ]
};
