import type { FastifyInstance } from 'fastify';
import { payables } from '../../../data/mock.js';

export async function payableRoutes(app: FastifyInstance) {
    app.get('/payables', async () => ({ items: payables }));
}
