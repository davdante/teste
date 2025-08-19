import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const session = await requireAuth();
  const goals = await db.goal.findMany({
    where: { familyId: session.familyId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { name, targetAmount, deadline } = body;

    if (!name || !targetAmount) {
      return NextResponse.json({ error: 'Nome e valor alvo são obrigatórios.' }, { status: 400 });
    }

    const goal = await db.goal.create({
      data: {
        familyId: session.familyId,
        name,
        targetAmount,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    console.error('Create goal error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { goalId, amount } = body;

    if (!goalId || !amount) {
      return NextResponse.json({ error: 'Meta e valor são obrigatórios.' }, { status: 400 });
    }

    // Validate ownership
    const goal = await db.goal.findFirst({ where: { id: goalId, familyId: session.familyId } });
    if (!goal) {
      return NextResponse.json({ error: 'Meta não encontrada.' }, { status: 404 });
    }

    const updated = await db.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: Number(goal.currentAmount) + Number(amount),
      },
    });

    return NextResponse.json({ success: true, goal: updated });
  } catch (error) {
    console.error('Update goal error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}