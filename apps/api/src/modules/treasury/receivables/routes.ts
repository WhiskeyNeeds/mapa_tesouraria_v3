import type { FastifyInstance } from 'fastify';
import { receivables } from '../../../data/mock.js';

export async function receivableRoutes(app: FastifyInstance) {
    app.get('/receivables', async () => ({ items: receivables }));
}
