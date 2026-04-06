import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { Assignment, UserProfile } from '@/types';
import ParentDashboard from '@/components/ParentDashboard';

export default async function ParentPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'parent') redirect('/dashboard');

  // 자녀 목록
  const { data: children } = await supabase
    .from('users')
    .select('*')
    .eq('parent_id', user.id);

  const childIds = (children ?? []).map((c: UserProfile) => c.id);

  // 자녀 전체 숙제
  const { data: assignments } = childIds.length
    ? await supabase
        .from('assignments')
        .select('*, user:users(id, name, email, avatar_url)')
        .in('user_id', childIds)
        .order('due_date', { ascending: true })
    : { data: [] };

  return (
    <ParentDashboard
      children={(children as UserProfile[]) ?? []}
      assignments={(assignments as Assignment[]) ?? []}
      parentId={user.id}
    />
  );
}
