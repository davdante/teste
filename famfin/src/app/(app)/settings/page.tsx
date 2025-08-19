import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function SettingsPage() {
  const session = await requireAuth();

  const [familyUsers, invitations] = await Promise.all([
    db.user.findMany({ where: { familyId: session.familyId }, orderBy: { name: 'asc' } }),
    db.invitation.findMany({ where: { familyId: session.familyId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const isOwner = (await db.user.findUnique({ where: { id: session.userId } }))?.role === 'OWNER';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-medium mb-3">Membros da Família</h2>
        <div className="divide-y">
          {familyUsers.map((u) => (
            <div key={u.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="text-xs px-2 py-1 rounded bg-muted">{u.role}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-medium mb-3">Convites</h2>
        {isOwner ? (
          <form
            action="/api/invitations"
            method="post"
            className="flex gap-2 mb-4"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="email do convidado"
              className="flex-1 border rounded-md px-3 py-2 bg-background"
            />
            <button className="rounded-md border px-3 py-2">Gerar Convite</button>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground mb-2">Apenas o Owner pode criar convites.</div>
        )}

        <div className="divide-y">
          {invitations.map((inv) => (
            <div key={inv.id} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{inv.email}</div>
                <div className="text-xs text-muted-foreground">Código: {inv.code}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {inv.usedAt ? 'Usado' : 'Pendente'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}