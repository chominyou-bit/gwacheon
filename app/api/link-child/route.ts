import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // 1. 현재 로그인 유저 확인 (anon 클라이언트)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 2. 보호자 역할 확인
  const { data: parentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (parentProfile?.role !== 'parent') {
    return NextResponse.json({ error: '보호자 계정만 자녀를 추가할 수 있습니다.' }, { status: 403 });
  }

  // 3. 요청 body에서 자녀 이메일 추출
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
  }

  // 4. service role 클라이언트로 자녀 찾기 및 연결 (RLS 우회)
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: child } = await admin
    .from('users')
    .select('id, name, email, parent_id')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (!child) {
    return NextResponse.json(
      { error: '해당 이메일로 가입된 계정을 찾을 수 없어요.\n자녀가 먼저 앱에 로그인해야 합니다.' },
      { status: 404 }
    );
  }

  if (child.id === user.id) {
    return NextResponse.json({ error: '본인 계정은 추가할 수 없습니다.' }, { status: 400 });
  }

  if (child.parent_id && child.parent_id !== user.id) {
    return NextResponse.json({ error: '이미 다른 보호자에게 연결된 계정입니다.' }, { status: 409 });
  }

  if (child.parent_id === user.id) {
    return NextResponse.json({ error: '이미 연결된 자녀입니다.' }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from('users')
    .update({ parent_id: user.id })
    .eq('id', child.id);

  if (updateError) {
    console.error('[link-child] update error:', updateError.message);
    return NextResponse.json({ error: '연결에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, child: { id: child.id, name: child.name, email: child.email } });
}
