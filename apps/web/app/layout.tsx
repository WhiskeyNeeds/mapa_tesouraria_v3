import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Mapa de Tesouraria',
    description: 'Aplicacao de tesouraria com Next.js + Fastify'
};

export default function RootLayout(props: { children: ReactNode }) {
    return (
        <html lang="pt-PT">
            <body>
                <Providers>{props.children}</Providers>
            </body>
        </html>
    );
}
