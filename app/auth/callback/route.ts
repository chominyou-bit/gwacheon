import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Supabase가 OAuth 실패 시 error 파라미터를 보냄
  if (errorParam) {
    console.error('[auth/callback] OAuth error:', errorParam, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  if (code) {
    // setAll에서 모아뒀다가 최종 redirect 응답에 직접 설정해야 쿠키가 브라우저에 전달됨
    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              pendingCookies.push({ name, value, options: options ?? {} })
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[auth/callback] getUser error:', userError?.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existing) {
      // 신규 사용자 — 기본 역할은 child
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        role: 'child',
        parent_id: null,
      });
      if (insertError) {
        console.error('[auth/callback] users insert error:', insertError.message, insertError.code);
      }
    }

    // 역할에 따라 리다이렉트, 세션 쿠키를 응답에 포함
    const role = existing?.role ?? 'child';
    const redirectPath = role === 'parent' ? '/dashboard/parent' : '/dashboard';
    const response = NextResponse.redirect(`${origin}${redirectPath}`);

    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  }

  console.error('[auth/callback] No code or error param in callback URL');
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
