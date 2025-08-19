import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMonthRange } from '@/lib/date';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function BudgetsPage() {
  const session = await requireAuth();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budgets = await db.budget.findMany({
    where: { familyId: session.familyId, month, year },
    include: { category: true },
  });

  const { start, end } = getMonthRange(year, month);
  const expenses = await db.transaction.findMany({
    where: { familyId: session.familyId, type: 'EXPENSE', date: { gte: start, lt: end } },
  });

  const spentByCategory: Record<string, number> = {};
  for (const t of expenses) {
    const key = t.categoryId || 'GENERAL';
    spentByCategory[key] = (spentByCategory[key] || 0) + Number(t.amount);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Orçamentos</h1>
      <div className="text-sm text-muted-foreground">{format(start, 'MMMM yyyy', { locale: ptBR })}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((b) => {
          const spent = b.type === 'GENERAL' 
            ? expenses.reduce((s, t) => s + Number(t.amount), 0)
            : (spentByCategory[b.categoryId || ''] || 0);
          const remaining = Number(b.limit) - spent;
          const pct = Math.min(100, Math.round((spent / Number(b.limit)) * 100));

          return (
            <div key={b.id} className="rounded-lg border bg-card p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">
                    {b.type === 'GENERAL' ? 'Geral' : b.category?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Limite: R$ {Number(b.limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Gasto</div>
                  <div className="font-semibold">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-2 text-sm {remaining < 0 ? 'text-red-600' : ''}">
                {remaining < 0 ? 'Ultrapassou o orçamento' : 'Disponível'}: R$ {Math.abs(remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          );
        })}
      </div>

      {budgets.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Nenhum orçamento cadastrado para este mês.
        </div>
      )}
    </div>
  );
}