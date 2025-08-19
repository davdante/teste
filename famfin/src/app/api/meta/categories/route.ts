import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await requireAuth();
  const categories = await db.category.findMany({
    where: { familyId: session.familyId },
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ categories });
}