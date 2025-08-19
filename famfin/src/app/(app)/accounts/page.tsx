import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Wallet } from 'lucide-react';

export default async function AccountsPage() {
  const session = await requireAuth();

  const accounts = await db.account.findMany({
    where: { familyId: session.familyId },
    include: {
      card: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contas e Cartões</h1>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              {account.type === 'CREDIT_CARD' ? (
                <CreditCard className="h-5 w-5 text-blue-600" />
              ) : (
                <Wallet className="h-5 w-5 text-green-600" />
              )}
              <h3 className="font-medium">{account.name}</h3>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span>
                  {account.type === 'CHECKING' && 'Conta Corrente'}
                  {account.type === 'SAVINGS' && 'Conta Poupança'}
                  {account.type === 'CREDIT_CARD' && 'Cartão de Crédito'}
                </span>
              </div>
              
              {account.type !== 'CREDIT_CARD' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo:</span>
                  <span className="font-medium">
                    R$ {Number(account.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              
              {account.card && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bandeira:</span>
                    <span>{account.card.brand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite:</span>
                    <span>
                      R$ {Number(account.card.creditLimit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fechamento:</span>
                    <span>Dia {account.card.closingDay}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span>Dia {account.card.dueDay}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>Nenhuma conta cadastrada.</p>
        </div>
      )}
    </div>
  );
}