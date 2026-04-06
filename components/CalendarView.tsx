'use client';

import { useEffect, useRef } from 'react';
import { Assignment, CalendarEvent } from '@/types';

interface CalendarViewProps {
  assignments: Assignment[];
}

function getDaysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getEventColor(assignment: Assignment): { bg: string; border: string } {
  if (assignment.status === 'done') return { bg: '#9ca3af', border: '#6b7280' };
  const days = getDaysUntil(assignment.due_date);
  if (days < 0) return { bg: '#9ca3af', border: '#6b7280' };
  if (days <= 1) return { bg: '#ef4444', border: '#dc2626' };
  if (days <= 3) return { bg: '#f97316', border: '#ea580c' };
  return { bg: '#3b82f6', border: '#2563eb' };
}

export default function CalendarView({ assignments }: CalendarViewProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    let destroyed = false;

    async function initCalendar() {
      const { Calendar } = await import('@fullcalendar/core');
      const dayGridPlugin = (await import('@fullcalendar/daygrid')).default;
      const interactionPlugin = (await import('@fullcalendar/interaction')).default;

      if (!calendarRef.current || destroyed) return;

      const events: CalendarEvent[] = assignments.map((a) => {
        const color = getEventColor(a);
        return {
          id: a.id,
          title: a.subject,
          date: a.due_date,
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: { assignment: a },
        };
      });

      const calendar = new Calendar(calendarRef.current, {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
          left: 'prev',
          center: 'title',
          right: 'next',
        },
        events,
        height: 'auto',
        eventClick: (info) => {
          const a = info.event.extendedProps.assignment as Assignment;
          alert(`📚 ${a.subject}\n📅 마감: ${a.due_date}\n\n${a.description}`);
        },
        dayMaxEvents: 3,
      });

      calendar.render();
      calendarInstanceRef.current = calendar;
    }

    initCalendar();

    return () => {
      destroyed = true;
      if (calendarInstanceRef.current) {
        (calendarInstanceRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [assignments]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div ref={calendarRef} />
      {/* 범례 */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { color: '#ef4444', label: '오늘/내일 마감' },
          { color: '#f97316', label: 'D-3 이내' },
          { color: '#3b82f6', label: '여유' },
          { color: '#9ca3af', label: '완료' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
