import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateInviteCode } from '@/lib/id';

export async function GET() {
  const session = await requireAuth();
  const invitations = await db.invitation.findMany({
    where: { familyId: session.familyId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ invitations });
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { email, expiresInDays = 30 } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    // Only owner can create invitations
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Apenas o Owner pode criar convites.' }, { status: 403 });
    }

    const code = generateInviteCode(10);

    const invitation = await db.invitation.create({
      data: {
        familyId: session.familyId,
        email,
        code,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}