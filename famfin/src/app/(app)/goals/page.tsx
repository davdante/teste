import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function GoalsPage() {
  const session = await requireAuth();

  const goals = await db.goal.findMany({
    where: { familyId: session.familyId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Metas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const target = Number(goal.targetAmount);
          const current = Number(goal.currentAmount);
          const pct = Math.min(100, Math.round((current / target) * 100));

          return (
            <div key={goal.id} className="rounded-lg border bg-card p-4">
              <div className="flex justify-between items-baseline">
                <div className="font-medium">{goal.name}</div>
                <div className="text-sm text-muted-foreground">R$ {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-sm flex justify-between">
                <span>Poupado</span>
                <span>R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Nenhuma meta cadastrada.
        </div>
      )}
    </div>
  );
}