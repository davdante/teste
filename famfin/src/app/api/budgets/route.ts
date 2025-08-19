import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getMonthRange } from '@/lib/date';

export async function GET(req: Request) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month')) || (new Date().getMonth() + 1);
  const year = Number(searchParams.get('year')) || new Date().getFullYear();

  const budgets = await db.budget.findMany({
    where: {
      familyId: session.familyId,
      month,
      year,
    },
    include: {
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate spent per category for the month
  const { start, end } = getMonthRange(year, month);
  const transactions = await db.transaction.findMany({
    where: {
      familyId: session.familyId,
      date: { gte: start, lt: end },
      type: 'EXPENSE',
    },
  });

  const spentByCategory: Record<string, number> = {};
  for (const t of transactions) {
    const key = t.categoryId || 'GENERAL';
    spentByCategory[key] = (spentByCategory[key] || 0) + Number(t.amount);
  }

  const result = budgets.map((b) => ({
    ...b,
    spent: b.type === 'GENERAL' 
      ? transactions.reduce((s, t) => s + Number(t.amount), 0)
      : (spentByCategory[b.categoryId || ''] || 0),
  }));

  return NextResponse.json({ budgets: result });
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { type, month, year, limit, categoryId } = body;

    if (!type || !month || !year || !limit) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    if (type === 'CATEGORY' && !categoryId) {
      return NextResponse.json({ error: 'Categoria é obrigatória para orçamento por categoria.' }, { status: 400 });
    }

    const budget = await db.budget.create({
      data: {
        familyId: session.familyId,
        type,
        month,
        year,
        limit,
        categoryId: categoryId || null,
      },
    });

    return NextResponse.json({ success: true, budget });
  } catch (error) {
    console.error('Create budget error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}