import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'Мастерская файлов — конвертация и обработка файлов онлайн',
  description: 'Конвертируйте изображения, PDF и документы. Без установки программ, без рекламы.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
