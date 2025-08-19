import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function TransactionsPage() {
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
    orderBy: {
      date: 'desc',
    },
  });

  // Fetch categories for filter
  const categories = await db.category.findMany({
    where: { familyId: session.familyId },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Movimentações</h1>
        <Link href="/(app)/transactions/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
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
        <div>
          <label className="text-xs text-muted-foreground">Categoria</label>
          <select className="block border rounded-md px-2 py-1 bg-background">
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {transactions.length > 0 ? (
          <div className="divide-y">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{transaction.description || 'Sem descrição'}</span>
                    <span className="text-xs text-muted-foreground">
                      {transaction.category?.name}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transaction.date), 'dd/MM/yyyy')} • {transaction.account.name}
                    {transaction.installmentsTotal && (
                      <span> • Parcela {transaction.installmentIndex}/{transaction.installmentsTotal}</span>
                    )}
                  </div>
                </div>
                <div className={`font-semibold ${
                  transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'INCOME' ? '+' : '-'} R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>Nenhuma transação encontrada para este período.</p>
            <Link href="/(app)/transactions/new" className="text-sm text-blue-600 hover:underline">
              Criar primeira transação
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}