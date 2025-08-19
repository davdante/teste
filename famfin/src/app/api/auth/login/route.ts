import { NextResponse } from 'next/server';
import { validateInvitation, createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code } = body as { email?: string; code?: string };

    if (!email || !code) {
      return NextResponse.json(
        { error: 'E-mail e código são obrigatórios.' },
        { status: 400 }
      );
    }

    const session = await validateInvitation(email, code);

    if (!session) {
      return NextResponse.json(
        { error: 'Código de convite inválido ou expirado.' },
        { status: 401 }
      );
    }

    await createSession(session);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}