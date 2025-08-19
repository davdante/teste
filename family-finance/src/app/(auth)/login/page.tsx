"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const result = await signIn("credentials", {
			redirect: false,
			email,
			inviteCode,
			password,
		});
		setLoading(false);
		if (result?.ok) {
			router.replace("/dashboard");
		} else {
			setError(result?.error || "Não foi possível entrar");
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
				<h1 className="text-2xl font-semibold">Entrar</h1>
				<div className="space-y-2">
					<label className="text-sm" htmlFor="email">E-mail</label>
					<input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
				</div>
				<div className="space-y-2">
					<label className="text-sm" htmlFor="invite">Código de convite</label>
					<input id="invite" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="w-full border rounded px-3 py-2" required />
				</div>
				<div className="space-y-2">
					<label className="text-sm" htmlFor="password">Senha (opcional)</label>
					<input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
				</div>
				{error && <p className="text-sm text-red-600">{error}</p>}
				<button disabled={loading} type="submit" className="w-full bg-black text-white py-2 rounded disabled:opacity-50">
					{loading ? "Entrando..." : "Entrar"}
				</button>
			</form>
		</div>
	);
}