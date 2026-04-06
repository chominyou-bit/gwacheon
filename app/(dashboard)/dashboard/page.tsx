import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { Assignment } from '@/types';
import ChildDashboard from '@/components/ChildDashboard';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'parent') redirect('/dashboard/parent');

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  return (
    <ChildDashboard
      initialAssignments={(assignments as Assignment[]) ?? []}
      userId={user.id}
    />
  );
}
