import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">FamFin</h1>
        <p className="text-muted-foreground">App de finanças pessoais para famílias.</p>
        <Link href="/(auth)/login" className="inline-flex items-center px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition">
          Entrar
        </Link>
      </div>
    </main>
  );
}