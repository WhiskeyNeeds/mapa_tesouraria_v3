import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../lib/jwt.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Token ausente' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const payload = verifyAccessToken(token);
        (request as FastifyRequest & { user: typeof payload }).user = payload;
    } catch {
        return reply.status(401).send({ message: 'Token invalido' });
    }
}
