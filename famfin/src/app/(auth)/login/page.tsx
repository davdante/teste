"use client";

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        setMessage('Login efetuado.');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.error || 'Falha no login.');
      }
    } catch (err) {
      setMessage('Erro de rede.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-card border rounded-lg p-6">
        <div>
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="text-sm text-muted-foreground">Use seu e-mail e código de convite</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm" htmlFor="email">E-mail</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-sm" htmlFor="code">Código de convite</label>
          <input id="code" required value={code} onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 outline-none" />
        </div>
        <button disabled={loading} className="w-full rounded-md bg-foreground text-background py-2 disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {message && <p className="text-sm text-center text-muted-foreground">{message}</p>}
      </form>
    </main>
  );
}