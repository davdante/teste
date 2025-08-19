export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Movimentações</h1>
      <div className="flex flex-wrap gap-3 items-end">
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
        <div>
          <label className="text-xs text-muted-foreground">Categoria</label>
          <select className="block border rounded-md px-2 py-1 bg-background">
            <option>Todos</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        <div className="p-3 text-sm text-muted-foreground">Lista de transações (placeholder)</div>
      </div>
    </div>
  );
}