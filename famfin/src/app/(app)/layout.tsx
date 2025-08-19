import { Sidebar } from '@/components/layout/Sidebar';
import { requireAuth } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to login if no session
  await requireAuth();

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen p-6">
        {children}
      </div>
    </div>
  );
}