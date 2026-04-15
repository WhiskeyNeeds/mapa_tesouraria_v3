import type { FastifyInstance } from 'fastify';
import { categories } from '../../../data/mock.js';

export async function settingsRoutes(app: FastifyInstance) {
    app.get('/settings/categories', async () => ({ items: categories }));
}
