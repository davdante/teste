import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FamFin',
  description: 'Finanças pessoais para famílias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}