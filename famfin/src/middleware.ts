import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  // TODO: Implementar proteção de rotas com sessão
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\..*).*)'],
};