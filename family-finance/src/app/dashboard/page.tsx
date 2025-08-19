import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) {
    return (
      <div className="p-6">
        <p>Você não está autenticado.</p>
        <Link className="underline" href="/login">Ir para login</Link>
      </div>
    );
  }

  const familyId = (session.user as any).familyId as string;

  const [totalIncome, totalExpense, accounts] = await Promise.all([
    prisma.transaction.aggregate({
      where: { familyId, type: "income" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { familyId, type: "expense" },
      _sum: { amount: true },
    }),
    prisma.account.findMany({ where: { familyId } }),
  ]);

  const income = Number(totalIncome._sum.amount ?? 0);
  const expense = Number(totalExpense._sum.amount ?? 0);
  const balance = income - expense;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <div className="text-sm text-muted-foreground">Receitas</div>
          <div className="text-2xl font-bold">R$ {income.toFixed(2)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-muted-foreground">Despesas</div>
          <div className="text-2xl font-bold">R$ {expense.toFixed(2)}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-muted-foreground">Saldo</div>
          <div className="text-2xl font-bold">R$ {balance.toFixed(2)}</div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Contas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded border p-4">
              <div className="text-sm text-muted-foreground">{acc.name} ({acc.type})</div>
              <div className="text-lg font-semibold">R$ {Number(acc.balance).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

