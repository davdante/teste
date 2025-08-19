import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="space-y-4 text-center">
				<h1 className="text-3xl font-semibold">Family Finance</h1>
				<p className="text-muted-foreground">Gerencie as finanças da sua família com orçamentos, metas e relatórios.</p>
				<div className="flex gap-3 justify-center">
					<Link className="px-4 py-2 rounded bg-black text-white" href="/login">Entrar</Link>
					<Link className="px-4 py-2 rounded border" href="/dashboard">Ir ao Dashboard</Link>
				</div>
			</div>
		</div>
	);
}
