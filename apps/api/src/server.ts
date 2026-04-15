import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);

const app = await buildApp();

try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API pronta em http://localhost:${port}`);
} catch (error) {
    app.log.error(error);
    process.exit(1);
}
