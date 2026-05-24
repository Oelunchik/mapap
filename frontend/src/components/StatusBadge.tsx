import React from 'react';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Новая',       cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'В работе',    cls: 'bg-blue-100 text-blue-700' },
  review:      { label: 'На проверке', cls: 'bg-yellow-100 text-yellow-700' },
  done:        { label: 'Готово',      cls: 'bg-green-100 text-green-700' },
  blocked:     { label: 'Заблокировано', cls: 'bg-red-100 text-red-700' },
};

const PRIORITY_MAP: Record<number, { label: string; cls: string }> = {
  1: { label: '🔴 Высокий', cls: 'bg-red-100 text-red-700' },
  2: { label: '🟡 Средний', cls: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'Низкий',     cls: 'bg-gray-100 text-gray-600' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function PriorityBadge({ priority }: { priority: number }) {
  const p = PRIORITY_MAP[priority] || { label: String(priority), cls: 'bg-gray-100 text-gray-600' };
  return <span className={`badge ${p.cls}`}>{p.label}</span>;
}
