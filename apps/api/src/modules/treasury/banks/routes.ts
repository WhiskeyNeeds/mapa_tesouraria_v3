import type { FastifyInstance } from 'fastify';
import { bankAccounts, bankMovements, bankTransactions } from '../../../data/mock.js';

export async function bankRoutes(app: FastifyInstance) {
    app.get('/banks/accounts', async () => ({ items: bankAccounts }));
    app.get('/banks/movements', async () => ({ items: bankMovements }));
    app.get('/bank/transactions', async () => ({ items: bankTransactions }));
}
