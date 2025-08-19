export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Relatórios</h1>
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1">Exportar CSV</button>
        <button className="rounded-md border px-3 py-1">Exportar Excel</button>
        <button className="rounded-md border px-3 py-1">Exportar PDF</button>
      </div>
      <div className="rounded-lg border bg-card p-4">DRE (Receitas - Despesas = Saldo) (placeholder)</div>
    </div>
  );
}