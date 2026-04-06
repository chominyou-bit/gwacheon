'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Assignment, UserProfile } from '@/types';
import AssignmentCard from './AssignmentCard';
import CalendarView from './CalendarView';

interface ParentDashboardProps {
  children: UserProfile[];
  assignments: Assignment[];
  parentId: string;
}

type TabType = 'overview' | 'calendar';

function getDaysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ParentDashboard({
  children,
  assignments,
  parentId,
}: ParentDashboardProps) {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // 자녀 추가 모달
  const [showAddChild, setShowAddChild] = useState(false);
  const [childEmail, setChildEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const handleAddChild = async () => {
    if (!childEmail.trim()) return;
    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      const res = await fetch('/api/link-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: childEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? '오류가 발생했습니다.');
      } else {
        setAddSuccess(`${data.child.name ?? data.child.email} 자녀가 추가되었습니다! 🎉`);
        setChildEmail('');
        setTimeout(() => {
          setShowAddChild(false);
          setAddSuccess('');
          router.refresh();
        }, 1500);
      }
    } catch {
      setAddError('네트워크 오류가 발생했습니다.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredAssignments =
    selectedChild === 'all'
      ? assignments
      : assignments.filter((a) => a.user_id === selectedChild);

  const pendingAssignments = filteredAssignments.filter((a) => a.status === 'pending');
  const urgentAssignments = pendingAssignments.filter((a) => {
    const days = getDaysUntil(a.due_date);
    return days >= 0 && days <= 1;
  });
  const overdueAssignments = pendingAssignments.filter((a) => getDaysUntil(a.due_date) < 0);

  // 자녀별 숙제 수 통계
  const childStats = children.map((child) => {
    const childAssignments = assignments.filter((a) => a.user_id === child.id);
    const pending = childAssignments.filter((a) => a.status === 'pending').length;
    const urgent = childAssignments.filter((a) => {
      if (a.status === 'done') return false;
      const days = getDaysUntil(a.due_date);
      return days >= 0 && days <= 1;
    }).length;
    return { child, pending, urgent };
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">

      {/* 자녀 추가 모달 */}
      {showAddChild && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowAddChild(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-800 mb-1">자녀 추가</h2>
            <p className="text-sm text-gray-500 mb-5">
              자녀가 먼저 앱에 로그인한 뒤, 그 Gmail 주소를 입력해 주세요.
            </p>

            <input
              type="email"
              value={childEmail}
              onChange={(e) => { setChildEmail(e.target.value); setAddError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
              placeholder="자녀 Gmail 주소"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 mb-3"
              autoFocus
            />

            {addError && (
              <p className="text-sm text-red-500 mb-3 whitespace-pre-line">{addError}</p>
            )}
            {addSuccess && (
              <p className="text-sm text-green-600 font-medium mb-3">{addSuccess}</p>
            )}

            <button
              onClick={handleAddChild}
              disabled={addLoading || !childEmail.trim()}
              className="w-full bg-blue-500 text-white rounded-xl py-3 font-medium text-sm disabled:opacity-50 transition-opacity"
            >
              {addLoading ? '연결 중...' : '자녀 추가하기'}
            </button>
          </div>
        </div>
      )}

      {/* 전체 요약 */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{pendingAssignments.length}</div>
          <div className="text-xs text-blue-500 mt-0.5">미완료</div>
        </div>
        <div className={`rounded-2xl p-3 text-center ${urgentAssignments.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-xl font-bold ${urgentAssignments.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {urgentAssignments.length}
          </div>
          <div className={`text-xs mt-0.5 ${urgentAssignments.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            오늘/내일 마감
          </div>
        </div>
        <div className={`rounded-2xl p-3 text-center ${overdueAssignments.length > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div className={`text-xl font-bold ${overdueAssignments.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {overdueAssignments.length}
          </div>
          <div className={`text-xs mt-0.5 ${overdueAssignments.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
            기한 초과
          </div>
        </div>
      </div>

      {/* 자녀 선택 탭 + 추가 버튼 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
        {children.length > 0 && (
          <button
            onClick={() => setSelectedChild('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedChild === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            전체 자녀
          </button>
        )}
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => setSelectedChild(child.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedChild === child.id
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {child.avatar_url && (
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <Image
                  src={child.avatar_url}
                  alt={child.name ?? ''}
                  width={20}
                  height={20}
                  className="object-cover"
                />
              </div>
            )}
            {child.name ?? child.email.split('@')[0]}
          </button>
        ))}
        <button
          onClick={() => { setShowAddChild(true); setAddError(''); setChildEmail(''); }}
          className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium bg-white text-gray-500 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + 자녀 추가
        </button>
      </div>

      {/* 자녀별 현황 카드 (전체 선택 시) */}
      {selectedChild === 'all' && childStats.length > 0 && (
        <div className="space-y-2 mb-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">자녀별 현황</h3>
          {childStats.map(({ child, pending, urgent }) => (
            <div
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {child.avatar_url ? (
                    <Image
                      src={child.avatar_url}
                      alt={child.name ?? ''}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 font-medium">
                      {(child.name ?? child.email)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{child.name ?? child.email}</p>
                  <p className="text-xs text-gray-400">
                    남은 숙제 {pending}개
                    {urgent > 0 && (
                      <span className="text-red-500 font-medium ml-1">· 긴급 {urgent}개 ⚠️</span>
                    )}
                  </p>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                urgent > 0 ? 'bg-red-100 text-red-600' : pending > 0 ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {urgent > 0 ? '!' : pending > 0 ? pending : '✓'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {(['overview', 'calendar'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {tab === 'overview' ? '📋 숙제 목록' : '📅 캘린더'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-3">
          {urgentAssignments.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-red-500 flex items-center gap-1">
                <span>🔴</span> 오늘/내일 마감
              </h3>
              {urgentAssignments.map((a) => (
                <AssignmentCard key={a.id} assignment={a} showChild />
              ))}
              {filteredAssignments.filter((a) => {
                const days = getDaysUntil(a.due_date);
                return a.status === 'pending' && days > 1;
              }).length > 0 && (
                <h3 className="text-sm font-semibold text-gray-500 pt-2">다가오는 숙제</h3>
              )}
            </>
          )}

          {filteredAssignments
            .filter((a) => {
              const days = getDaysUntil(a.due_date);
              return a.status === 'pending' && days > 1;
            })
            .map((a) => (
              <AssignmentCard key={a.id} assignment={a} showChild />
            ))}

          {filteredAssignments.filter((a) => a.status === 'pending').length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">미완료 숙제가 없어요!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <CalendarView assignments={filteredAssignments} />
      )}

      {/* 자녀가 없을 때 안내 */}
      {children.length === 0 && (
        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👧</div>
          <p className="font-medium text-purple-700 mb-1">아직 연결된 자녀가 없어요</p>
          <p className="text-sm text-purple-500 mb-4">
            자녀가 먼저 앱에 로그인한 뒤,<br />위의 "+ 자녀 추가" 버튼을 눌러주세요.
          </p>
          <button
            onClick={() => { setShowAddChild(true); setAddError(''); setChildEmail(''); }}
            className="bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            + 자녀 추가하기
          </button>
        </div>
      )}
    </div>
  );
}
