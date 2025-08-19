import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, code } = body as { email?: string; code?: string };

  if (!email || !code) {
    return NextResponse.json({ error: 'E-mail e código são obrigatórios.' }, { status: 400 });
  }

  // TODO: Integrar com Prisma, validar convite e criar sessão
  // Por enquanto, aceitar qualquer combinação não vazia
  return NextResponse.json({ ok: true }, { status: 200 });
}