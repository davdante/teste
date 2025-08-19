import { db } from './db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface Session {
  userId: string;
  familyId: string;
  email: string;
  name: string;
  role: string;
}

export async function validateInvitation(email: string, code: string): Promise<Session | null> {
  const invitation = await db.invitation.findFirst({
    where: {
      code,
      email,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      family: true,
    },
  });

  if (!invitation) {
    return null;
  }

  // Check if user already exists
  let user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create new user
    user = await db.user.create({
      data: {
        email,
        name: email.split('@')[0], // Simple name from email
        role: 'INVITED',
        familyId: invitation.familyId,
      },
    });
  } else if (user.familyId !== invitation.familyId) {
    // User exists but not in this family
    return null;
  }

  // Mark invitation as used
  await db.invitation.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  });

  return {
    userId: user.id,
    familyId: invitation.familyId,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session');
  
  if (!sessionToken?.value) {
    return null;
  }

  try {
    // Simple session validation - in production, use proper JWT or session store
    const session = JSON.parse(sessionToken.value) as Session;
    
    // Verify user still exists
    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function createSession(session: Session) {
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect('/(auth)/login');
  }
  return session;
}