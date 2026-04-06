'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserProfile } from '@/types';
import { createClient } from '@/lib/supabase-browser';

interface NavBarProps {
  profile: UserProfile;
}

export default function NavBar({ profile }: NavBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm safe-top sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-14">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="font-bold text-gray-800 text-sm">
            {profile.role === 'parent' ? '수행평가 D-day' : '수행평가 D-day'}
          </span>
        </div>

        {/* 역할 뱃지 + 아바타 */}
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              profile.role === 'parent'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {profile.role === 'parent' ? '부모' : '학생'}
          </span>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0"
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.name ?? ''}
                fill
                className="object-cover"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-gray-600 text-sm font-medium">
                {(profile.name ?? profile.email)[0].toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-48 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800 truncate">
                {profile.name ?? '사용자'}
              </p>
              <p className="text-xs text-gray-400 truncate">{profile.email}</p>
            </div>
            {profile.role === 'parent' && (
              <button
                onClick={() => {
                  router.push('/dashboard/parent');
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                대시보드
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </header>
  );
}
