import Fastify from 'fastify';
import cors from '@fastify/cors';
import { treasuryModule } from './modules/treasury/index.js';
import { authRoutes } from './modules/auth/routes.js';
import { authGuard } from './plugins/auth.js';

export async function buildApp() {
    const app = Fastify({ logger: true });

    await app.register(cors, {
        origin: true
    });

    app.get('/health', async () => ({ ok: true }));

    await app.register(authRoutes, { prefix: '/api' });

    await app.register(async (protectedApp) => {
        protectedApp.addHook('onRequest', authGuard);
        await protectedApp.register(treasuryModule, { prefix: '/api' });
    });

    return app;
}
