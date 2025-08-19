import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function DashboardPage() {
  const session = await requireAuth();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch transactions for current month
  const transactions = await db.transaction.findMany({
    where: {
      familyId: session.familyId,
      date: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
    include: {
      category: true,
      account: true,
    },
  });

  // Calculate totals
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;

  // Get total balance from accounts
  const accounts = await db.account.findMany({
    where: { familyId: session.familyId },
  });

  const totalBalance = accounts.reduce((sum, account) => {
    if (account.type === 'CREDIT_CARD') {
      return sum; // Don't include credit card balance in total
    }
    return sum + Number(account.balance);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Mês</label>
          <select 
            defaultValue={currentMonth}
            className="block border rounded-md px-2 py-1 bg-background"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option value={i + 1} key={i}>
                {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Ano</label>
          <select 
            defaultValue={currentYear}
            className="block border rounded-md px-2 py-1 bg-background"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>{y}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Saldo Total</div>
          <div className="text-2xl font-semibold">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Receitas (mês)</div>
          <div className="text-2xl font-semibold text-green-600">
            R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Despesas (mês)</div>
          <div className="text-2xl font-semibold text-red-600">
            R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-card min-h-[240px]">
          <h3 className="font-medium mb-2">Gastos por categoria</h3>
          <div className="text-sm text-muted-foreground">
            {transactions.filter(t => t.type === 'EXPENSE').length > 0 ? (
              <ul className="space-y-1">
                {transactions
                  .filter(t => t.type === 'EXPENSE')
                  .slice(0, 5)
                  .map((t) => (
                    <li key={t.id} className="flex justify-between">
                      <span>{t.category?.name || 'Sem categoria'}</span>
                      <span>R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p>Nenhuma despesa registrada este mês</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card min-h-[240px]">
          <h3 className="font-medium mb-2">Evolução do saldo</h3>
          <div className="text-sm text-muted-foreground">
            <p>Saldo do mês: R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p>Total de transações: {transactions.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 bg-card">
        <h3 className="font-medium mb-2">Alertas rápidos</h3>
        <div className="text-sm text-muted-foreground">
          {balance < 0 ? (
            <p className="text-red-600">⚠️ Saldo negativo este mês</p>
          ) : (
            <p className="text-green-600">✅ Saldo positivo</p>
          )}
        </div>
      </div>
    </div>
  );
}