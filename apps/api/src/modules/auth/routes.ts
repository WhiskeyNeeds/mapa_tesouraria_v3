import type { FastifyInstance } from 'fastify';
import { signAccessToken } from '../../lib/jwt.js';

type LoginBody = {
    email: string;
    password: string;
};

const DEMO_USER = {
    id: 'user-demo-1',
    email: 'demo@bizzpm.pt',
    password: '123456',
    name: 'Demo User'
};

export async function authRoutes(app: FastifyInstance) {
    app.post<{ Body: LoginBody }>('/v1/auth/login', async (request, reply) => {
        const { email, password } = request.body;

        if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
            return reply.status(401).send({ message: 'Credenciais invalidas' });
        }

        const accessToken = signAccessToken({
            sub: DEMO_USER.id,
            email: DEMO_USER.email,
            name: DEMO_USER.name
        });

        return {
            accessToken,
            user: {
                email: DEMO_USER.email,
                name: DEMO_USER.name
            }
        };
    });
}
