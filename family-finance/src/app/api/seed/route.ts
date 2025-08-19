import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST() {
  // idempotent seed: find or create
  const existing = await prisma.family.findFirst({ where: { inviteCode: "FAM-123456" } });
  if (existing) return NextResponse.json({ ok: true, familyId: existing.id });

  const family = await prisma.family.create({
    data: {
      name: "Família Souza",
      inviteCode: "FAM-123456",
      users: {
        create: [
          {
            name: "Owner",
            email: "owner@example.com",
            role: "OWNER",
            passwordHash: await bcrypt.hash("owner123", 10),
          },
          {
            name: "Convidado",
            email: "invited@example.com",
            role: "INVITED",
            passwordHash: await bcrypt.hash("guest123", 10),
          },
        ],
      },
      categories: {
        create: [
          { name: "Salário", kind: "income" },
          { name: "Alimentação", kind: "expense" },
          { name: "Transporte", kind: "expense" },
          { name: "Lazer", kind: "expense" },
        ],
      },
      accounts: {
        create: [
          { name: "Banco", type: "bank", balance: 0 },
          { name: "Carteira", type: "cash", balance: 0 },
          { name: "Cartão", type: "credit_card", balance: 0, dueDay: 15 },
        ],
      },
    },
  });

  return NextResponse.json({ ok: true, familyId: family.id });
}

