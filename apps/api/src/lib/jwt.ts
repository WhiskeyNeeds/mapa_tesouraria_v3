import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

type JwtPayload = {
    sub: string;
    email: string;
    name: string;
};

export function signAccessToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
