import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    
    const {
      type,
      amount,
      date,
      description,
      categoryId,
      accountId,
      paymentMethod,
      installmentsTotal,
    } = body;

    // Validate required fields
    if (!type || !amount || !date || !accountId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tipo, valor, data e conta.' },
        { status: 400 }
      );
    }

    // Validate account belongs to family
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        familyId: session.familyId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada.' },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: categoryId,
          familyId: session.familyId,
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Categoria não encontrada.' },
          { status: 404 }
        );
      }
    }

    const transactionDate = new Date(date);
    const transactions = [];

    // Handle installments for credit card payments
    if (paymentMethod === 'CREDIT' && installmentsTotal && installmentsTotal > 1) {
      const installmentAmount = Number(amount) / installmentsTotal;
      
      for (let i = 1; i <= installmentsTotal; i++) {
        const installmentDate = new Date(transactionDate);
        installmentDate.setMonth(installmentDate.getMonth() + i - 1);
        
        const transaction = await db.transaction.create({
          data: {
            familyId: session.familyId,
            accountId,
            categoryId,
            type,
            amount: installmentAmount,
            date: installmentDate,
            description: `${description} (${i}/${installmentsTotal})`,
            paymentMethod,
            installmentsTotal,
            installmentIndex: i,
          },
        });
        
        transactions.push(transaction);
      }
    } else {
      // Single transaction
      const transaction = await db.transaction.create({
        data: {
          familyId: session.familyId,
          accountId,
          categoryId,
          type,
          amount: Number(amount),
          date: transactionDate,
          description,
          paymentMethod,
        },
      });
      
      transactions.push(transaction);
    }

    // Update account balance (only for non-credit card accounts)
    if (account.type !== 'CREDIT_CARD') {
      const balanceChange = type === 'INCOME' ? Number(amount) : -Number(amount);
      await db.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      transactions,
      message: transactions.length > 1 
        ? `${transactions.length} parcelas criadas com sucesso.`
        : 'Transação criada com sucesso.'
    });
  } catch (error) {
    console.error('Transaction creation error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}