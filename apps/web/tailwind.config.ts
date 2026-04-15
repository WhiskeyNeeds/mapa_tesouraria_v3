import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
        './stores/**/*.{ts,tsx}'
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(52 45% 96%)',
                foreground: 'hsl(160 25% 14%)',
                card: 'hsl(45 60% 98%)',
                border: 'hsl(45 20% 84%)',
                primary: {
                    DEFAULT: 'hsl(159 58% 34%)',
                    foreground: 'hsl(0 0% 100%)'
                },
                accent: {
                    DEFAULT: 'hsl(39 85% 63%)',
                    foreground: 'hsl(161 35% 14%)'
                },
                muted: {
                    DEFAULT: 'hsl(154 17% 90%)',
                    foreground: 'hsl(160 13% 35%)'
                },
                destructive: {
                    DEFAULT: 'hsl(7 56% 44%)',
                    foreground: 'hsl(0 0% 100%)'
                }
            },
            borderRadius: {
                lg: '0.9rem',
                md: '0.7rem',
                sm: '0.5rem'
            },
            fontFamily: {
                sans: ['Manrope', 'Segoe UI', 'sans-serif']
            }
        }
    },
    plugins: [require('tailwindcss-animate')]
};

export default config;
