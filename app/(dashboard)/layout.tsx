import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import NavBar from '@/components/NavBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // 프로필이 없으면 자동으로 생성 (auth/callback insert 실패 시 복구)
  if (!profile) {
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.email ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        role: 'child',
        parent_id: null,
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      console.error('[dashboard/layout] profile upsert error:', insertError?.message);
      redirect('/login');
    }
    profile = inserted;
  }

  if (!profile) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar profile={profile} />
      <main className="flex-1 pb-6 safe-bottom">
        {children}
      </main>
    </div>
  );
}
