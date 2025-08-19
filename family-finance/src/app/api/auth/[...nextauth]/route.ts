import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
	session: { strategy: "jwt" },
	providers: [
		Credentials({
			name: "Login",
			credentials: {
				email: { label: "Email", type: "email" },
				inviteCode: { label: "Invite Code", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.inviteCode) return null;

				const user = await prisma.user.findFirst({
					where: {
						email: credentials.email,
						family: { inviteCode: credentials.inviteCode },
					},
					include: { family: true },
				});
				if (!user) return null;

				if (user.passwordHash && credentials.password) {
					const ok = await bcrypt.compare(credentials.password, user.passwordHash);
					if (!ok) return null;
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					familyId: user.familyId,
				} as any;
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.user = user as any;
			}
			return token;
		},
		async session({ session, token }) {
			if ((token as any).user) {
				(session as any).user = (token as any).user;
			}
			return session;
		},
	},
});

export { handler as GET, handler as POST };