import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3 } from 'lucide-react';

export default async function ReportsPage() {
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

  // Calculate DRE
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;

  // Group expenses by category
  const expensesByCategory = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Sem categoria';
      acc[categoryName] = (acc[categoryName] || 0) + Number(transaction.amount);
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            PDF
          </Button>
        </div>
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
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">DRE - Demonstração do Resultado</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Receitas</span>
            <span className="text-green-600 font-semibold">
              R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Despesas</span>
            <span className="text-red-600 font-semibold">
              R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-lg font-bold">
            <span>Saldo Final</span>
            <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-3">Gastos por Categoria</h3>
          {Object.keys(expensesByCategory).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="text-sm font-medium">
                      R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-3">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total de transações:</span>
              <span>{transactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Receitas:</span>
              <span>{transactions.filter(t => t.type === 'INCOME').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Despesas:</span>
              <span>{transactions.filter(t => t.type === 'EXPENSE').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Maior receita:</span>
              <span>
                R$ {Math.max(...transactions.filter(t => t.type === 'INCOME').map(t => Number(t.amount)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Maior despesa:</span>
              <span>
                R$ {Math.max(...transactions.filter(t => t.type === 'EXPENSE').map(t => Number(t.amount)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}