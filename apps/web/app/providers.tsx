'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { type ReactNode, useState } from 'react';

export function Providers(props: { children: ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60_000,
                        retry: 1
                    }
                }
            })
    );

    return (
        <QueryClientProvider client={client}>
            {props.children}
            <Toaster richColors position="top-right" />
        </QueryClientProvider>
    );
}
