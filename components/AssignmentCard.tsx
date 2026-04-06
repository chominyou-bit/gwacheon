'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Assignment } from '@/types';
import { createClient } from '@/lib/supabase-browser';

interface AssignmentCardProps {
  assignment: Assignment;
  onUpdate?: () => void;
  showChild?: boolean;
}

function getDaysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyStyle(daysUntil: number): string {
  if (daysUntil < 0) return 'border-gray-200 bg-gray-50';
  if (daysUntil <= 1) return 'border-red-300 bg-red-50';
  if (daysUntil <= 3) return 'border-orange-300 bg-orange-50';
  return 'border-gray-200 bg-white';
}

export default function AssignmentCard({
  assignment,
  onUpdate,
  showChild = false,
}: AssignmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: assignment.subject,
    due_date: assignment.due_date,
    description: assignment.description,
  });

  const supabase = createClient();
  const daysUntil = getDaysUntil(assignment.due_date);
  const urgencyStyle = getUrgencyStyle(daysUntil);
  const isDone = assignment.status === 'done';
  const isOverdue = daysUntil < 0;

  const toggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    const newStatus = isDone ? 'pending' : 'done';
    await supabase
      .from('assignments')
      .update({ status: newStatus })
      .eq('id', assignment.id);
    onUpdate?.();
    setToggling(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.subject || !editForm.due_date) return;
    setSaving(true);
    await supabase
      .from('assignments')
      .update({
        subject: editForm.subject,
        due_date: editForm.due_date,
        description: editForm.description,
      })
      .eq('id', assignment.id);
    setSaving(false);
    setEditing(false);
    onUpdate?.();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <>
      {/* 이미지 전체화면 뷰어 */}
      {imageFullscreen && assignment.image_url && (
        <div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          onClick={() => setImageFullscreen(false)}
        >
          <img
            src={assignment.image_url}
            alt="전체화면"
            className="max-w-full max-h-full object-contain"
          />
          <button className="absolute top-6 right-6 text-white text-4xl font-bold">✕</button>
          <p className="absolute bottom-6 text-white text-sm opacity-70">탭하면 닫힙니다</p>
        </div>
      )}

      <div
        className={`border rounded-2xl p-4 cursor-pointer transition-all ${urgencyStyle} ${isDone ? 'opacity-60' : ''}`}
        onClick={() => { setExpanded(!expanded); setEditing(false); }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 완료 체크박스 */}
            <button
              onClick={toggleStatus}
              disabled={toggling}
              className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                isDone
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {isDone && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800 text-base">{assignment.subject}</span>
                {showChild && assignment.user && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {assignment.user.name ?? assignment.user.email}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-medium ${
                    isOverdue
                      ? 'text-gray-400 line-through'
                      : daysUntil <= 1
                      ? 'text-red-600 font-bold'
                      : daysUntil <= 3
                      ? 'text-orange-600'
                      : 'text-gray-500'
                  }`}
                >
                  📅 {formatDate(assignment.due_date)}
                </span>
                {!isDone && !isOverdue && daysUntil <= 1 && (
                  <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    오늘마감!
                  </span>
                )}
                {!isDone && !isOverdue && daysUntil === 2 && (
                  <span className="text-xs bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">
                    D-2
                  </span>
                )}
                {isOverdue && !isDone && (
                  <span className="text-xs bg-gray-400 text-white px-1.5 py-0.5 rounded-full">
                    기한초과
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 이미지 썸네일 */}
          {assignment.image_url && (
            <div
              className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setImageFullscreen(true); }}
            >
              <Image
                src={assignment.image_url}
                alt="숙제 사진"
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </div>

        {/* 상세 내용 */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
            {!editing ? (
              <>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{assignment.description}</p>

                {assignment.image_url && (
                  <div
                    className="relative mt-2 rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => setImageFullscreen(true)}
                  >
                    <Image
                      src={assignment.image_url}
                      alt="숙제 사진 전체"
                      width={400}
                      height={300}
                      className="object-contain w-full max-h-48"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      🔍 탭하면 확대
                    </div>
                  </div>
                )}

                {!showChild && (
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 w-full border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ✏️ 날짜 / 내용 수정
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">과목명</label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <label className="text-xs font-bold text-orange-700 mb-2 block">📅 마감일 수정</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={editForm.due_date ? parseInt(editForm.due_date.split('-')[1]) : ''}
                        onChange={(e) => {
                          const parts = editForm.due_date.split('-');
                          setEditForm({ ...editForm, due_date: `${parts[0]}-${e.target.value.padStart(2,'0')}-${parts[2]}` });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">월</span>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={editForm.due_date ? parseInt(editForm.due_date.split('-')[2]) : ''}
                        onChange={(e) => {
                          const parts = editForm.due_date.split('-');
                          setEditForm({ ...editForm, due_date: `${parts[0]}-${parts[1]}-${e.target.value.padStart(2,'0')}` });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">일</span>
                    </div>
                    <div className="flex-[1.5] relative">
                      <input
                        type="number"
                        min="2024"
                        max="2099"
                        value={editForm.due_date ? parseInt(editForm.due_date.split('-')[0]) : ''}
                        onChange={(e) => {
                          const parts = editForm.due_date.split('-');
                          setEditForm({ ...editForm, due_date: `${e.target.value}-${parts[1]}-${parts[2]}` });
                        }}
                        className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">년</span>
                    </div>
                  </div>
                  {editForm.due_date && (
                    <p className="text-xs text-orange-600 font-medium mt-1 text-center">
                      → {new Date(editForm.due_date + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">숙제 내용</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-500"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 bg-blue-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
