export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Mês</label>
          <select className="block border rounded-md px-2 py-1 bg-background">
            {Array.from({ length: 12 }).map((_, i) => (
              <option value={i + 1} key={i}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Ano</label>
          <select className="block border rounded-md px-2 py-1 bg-background">
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
        {[
          { label: 'Saldo Total', value: 'R$ 0,00' },
          { label: 'Receitas (mês)', value: 'R$ 0,00' },
          { label: 'Despesas (mês)', value: 'R$ 0,00' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border p-4 bg-card">
            <div className="text-sm text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-card min-h-[240px]">Gráfico: Gastos por categoria</div>
        <div className="rounded-lg border p-4 bg-card min-h-[240px]">Gráfico: Evolução do saldo</div>
      </div>

      <div className="rounded-lg border p-4 bg-card">Alertas rápidos</div>
    </div>
  );
}