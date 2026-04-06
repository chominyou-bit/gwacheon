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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <div
      className={`border rounded-2xl p-4 cursor-pointer transition-all ${urgencyStyle} ${isDone ? 'opacity-60' : ''}`}
      onClick={() => setExpanded(!expanded)}
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
            {/* 과목 + 자녀 이름 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800 text-base">{assignment.subject}</span>
              {showChild && assignment.user && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  {assignment.user.name ?? assignment.user.email}
                </span>
              )}
            </div>

            {/* 마감일 */}
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
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
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
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">{assignment.description}</p>
          {assignment.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden">
              <Image
                src={assignment.image_url}
                alt="숙제 사진 전체"
                width={400}
                height={300}
                className="object-contain w-full max-h-48"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
