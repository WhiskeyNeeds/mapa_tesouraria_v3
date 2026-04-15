import type { FastifyInstance } from 'fastify';
import { cashflowMirror, dashboardData, expectedPositioning, bankJournal, financingData } from '../../../data/mock.js';

export async function dashboardRoutes(app: FastifyInstance) {
    app.get('/dashboard', async () => dashboardData);
    app.get('/cashflow/matrix', async () => cashflowMirror);
    app.get('/expected/positioning', async () => expectedPositioning);
    app.get('/bank/journal', async () => bankJournal);
    app.get('/financing', async () => financingData);
}
