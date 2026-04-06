'use client';

import { useState, useCallback } from 'react';
import { Assignment } from '@/types';
import AssignmentCard from './AssignmentCard';
import CalendarView from './CalendarView';
import UploadModal from './UploadModal';
import { createClient } from '@/lib/supabase-browser';

interface ChildDashboardProps {
  initialAssignments: Assignment[];
  userId: string;
}

type TabType = 'list' | 'calendar';

export default function ChildDashboard({ initialAssignments, userId }: ChildDashboardProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const supabase = createClient();

  const refreshAssignments = useCallback(async () => {
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    setAssignments((data as Assignment[]) ?? []);
  }, [supabase, userId]);

  const filtered = assignments.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const urgentCount = assignments.filter((a) => {
    if (a.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(a.due_date);
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 1;
  }).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
          <div className="text-sm text-blue-500 mt-0.5">남은 숙제</div>
        </div>
        <div className={`rounded-2xl p-4 ${urgentCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className={`text-2xl font-bold ${urgentCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {urgentCount}
          </div>
          <div className={`text-sm mt-0.5 ${urgentCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {urgentCount > 0 ? '오늘/내일 마감 🔴' : '급한 숙제 없음 ✅'}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {(['list', 'calendar'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {tab === 'list' ? '📋 목록' : '📅 캘린더'}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          {/* 필터 */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {[
              { key: 'pending', label: '미완료' },
              { key: 'all', label: '전체' },
              { key: 'done', label: '완료' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 숙제 목록 */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">
                  {filter === 'done' ? '🎉' : '📭'}
                </div>
                <p className="font-medium">
                  {filter === 'done' ? '완료한 숙제가 없어요' : '숙제가 없어요!'}
                </p>
                {filter !== 'done' && (
                  <p className="text-sm mt-1">아래 버튼을 눌러 숙제를 추가하세요</p>
                )}
              </div>
            ) : (
              filtered.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  onUpdate={refreshAssignments}
                />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'calendar' && (
        <CalendarView assignments={assignments} />
      )}

      {/* FAB — 숙제 추가 버튼 */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-8 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform z-30 safe-bottom"
        style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        +
      </button>

      {showUpload && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onSuccess={refreshAssignments}
        />
      )}
    </div>
  );
}
