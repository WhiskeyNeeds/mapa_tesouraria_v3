import type { FastifyInstance } from 'fastify';
import { dashboardRoutes } from './dashboard/routes.js';
import { bankRoutes } from './banks/routes.js';
import { reconciliationRoutes } from './reconciliation/routes.js';
import { receivableRoutes } from './receivables/routes.js';
import { payableRoutes } from './payables/routes.js';
import { settingsRoutes } from './settings/routes.js';

export async function treasuryModule(app: FastifyInstance) {
    await app.register(dashboardRoutes, { prefix: '/v1/treasury' });
    await app.register(bankRoutes, { prefix: '/v1/treasury' });
    await app.register(reconciliationRoutes, { prefix: '/v1/treasury' });
    await app.register(receivableRoutes, { prefix: '/v1/treasury' });
    await app.register(payableRoutes, { prefix: '/v1/treasury' });
    await app.register(settingsRoutes, { prefix: '/v1/treasury' });
}
