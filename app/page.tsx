import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function RootPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 역할에 따라 리다이렉트
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'parent') {
    redirect('/dashboard/parent');
  }

  redirect('/dashboard');
}
