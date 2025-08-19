"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Option { id: string; name: string; type?: string }

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    categoryId: '',
    accountId: '',
    paymentMethod: 'DEBIT',
    installmentsTotal: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch('/api/meta/accounts'),
          fetch('/api/meta/categories'),
        ]);
        const acc = await accRes.json();
        const cat = await catRes.json();
        setAccounts(acc.accounts || []);
        setCategories(cat.categories || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          installmentsTotal: formData.installmentsTotal ? Number(formData.installmentsTotal) : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Transação criada com sucesso! Redirecionando...');
        setTimeout(() => router.push('/(app)/transactions'), 1000);
      } else {
        setMessage(data?.error || 'Erro ao criar transação.');
      }
    } catch (error) {
      setMessage('Erro de rede.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold">Nova Transação</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-card border rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Valor</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
              placeholder="0,00"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Data</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Descrição</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
            placeholder="Descrição da transação"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Conta</label>
            <select
              required
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Categoria</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Forma de Pagamento</label>
            <select
              required
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
            >
              <option value="CASH">Dinheiro</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
              <option value="PIX">PIX</option>
              <option value="TRANSFER">Transferência</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Parcelas</label>
            <input
              type="number"
              min="1"
              max="24"
              value={formData.installmentsTotal}
              onChange={(e) => setFormData({ ...formData, installmentsTotal: e.target.value })}
              className="w-full mt-1 border rounded-md px-3 py-2 bg-background"
              placeholder="1"
              disabled={formData.paymentMethod !== 'CREDIT'}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Criando...' : 'Criar Transação'}
          </Button>
        </div>

        {message && (
          <p className={`text-sm text-center ${
            message.includes('sucesso') ? 'text-green-600' : 'text-red-600'
          }`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}