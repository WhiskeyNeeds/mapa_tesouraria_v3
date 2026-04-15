import type { FastifyInstance } from 'fastify';

export async function reconciliationRoutes(app: FastifyInstance) {
    app.post('/reconciliation/preview', async (request) => {
        return {
            dryRun: true,
            mensagem: 'Pre-visualizacao gerada. Nenhuma escrita no TOConline.',
            input: request.body ?? {}
        };
    });
}
