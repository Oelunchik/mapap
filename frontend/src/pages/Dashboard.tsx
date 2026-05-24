import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { SummaryRow, Task } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import TaskModal from '../components/TaskModal';
import { useAuth } from './AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [urgent, setUrgent] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);

  async function load() {
    try {
      const [s, o, all] = await Promise.all([
        api.getSummary(),
        api.getOverdue(),
        api.getTasks({ priority: 1 }),
      ]);
      setSummary(s);
      setOverdue(o);
      setUrgent(all.filter(t => t.status !== 'done').slice(0, 8));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totals = summary.reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total),
      high: acc.high + Number(r.high_priority),
      in_progress: acc.in_progress + Number(r.in_progress),
      done: acc.done + Number(r.done),
    }),
    { total: 0, high: 0, in_progress: 0, done: 0 }
  );

  function dueLabel(d?: string) {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return <span className="text-red-600 text-xs font-medium">Просрочено</span>;
    if (diff <= 2) return <span className="text-orange-500 text-xs font-medium">Через {diff} дн.</span>;
    return <span className="text-gray-400 text-xs">{new Date(d).toLocaleDateString('ru-RU')}</span>;
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Загрузка...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-500 text-sm mt-0.5">Проектный офис по транспорту и логистике РК</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Всего задач', value: totals.total, color: 'bg-blue-50 text-blue-700', icon: '📋' },
          { label: 'Высокий приоритет', value: totals.high, color: 'bg-red-50 text-red-700', icon: '🔴' },
          { label: 'В работе', value: totals.in_progress, color: 'bg-yellow-50 text-yellow-700', icon: '⚙️' },
          { label: 'Просрочено', value: overdue.length, color: overdue.length ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700', icon: '⏰' },
        ].map(card => (
          <div key={card.label} className={`card p-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-3xl font-bold">{card.value}</span>
            </div>
            <div className="mt-2 text-sm font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Table */}
        {user?.role === 'head' && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Сводная таблица по сотрудникам</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs">
                    <th className="text-left pb-2">Сотрудник</th>
                    <th className="text-center pb-2">Всего</th>
                    <th className="text-center pb-2">🔴</th>
                    <th className="text-center pb-2">🟡</th>
                    <th className="text-center pb-2">В работе</th>
                    <th className="text-center pb-2">Готово</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 font-medium">{r.full_name}</td>
                      <td className="text-center py-2 font-bold">{r.total}</td>
                      <td className="text-center py-2 text-red-600">{r.high_priority}</td>
                      <td className="text-center py-2 text-yellow-600">{r.medium_priority}</td>
                      <td className="text-center py-2 text-blue-600">{r.in_progress}</td>
                      <td className="text-center py-2 text-green-600">{r.done}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold text-sm border-t-2">
                    <td className="py-2">Итого</td>
                    <td className="text-center py-2">{totals.total}</td>
                    <td className="text-center py-2 text-red-600">{totals.high}</td>
                    <td className="text-center py-2 text-yellow-600">{summary.reduce((a,r) => a + Number(r.medium_priority), 0)}</td>
                    <td className="text-center py-2 text-blue-600">{totals.in_progress}</td>
                    <td className="text-center py-2 text-green-600">{totals.done}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Urgent/High priority tasks */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">🔴 Высокий приоритет</h2>
          <div className="space-y-2">
            {urgent.length === 0 ? (
              <p className="text-gray-400 text-sm">Нет задач высокого приоритета</p>
            ) : urgent.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t.id)}
                className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{t.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{t.assignee_name}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{t.direction_name}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={t.status} />
                  {dueLabel(t.due_date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="card p-5 border-red-200">
          <h2 className="text-base font-semibold text-red-700 mb-4">⏰ Просроченные задачи ({overdue.length})</h2>
          <div className="space-y-2">
            {overdue.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t.id)}
                className="flex items-center justify-between gap-3 p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{t.title}</span>
                  <span className="text-xs text-gray-500 ml-2">— {t.assignee_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <span className="text-red-600 text-xs font-medium">
                    {new Date(t.due_date!).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskModal taskId={selectedTask} onClose={() => setSelectedTask(null)} onSaved={load} />
      )}
    </div>
  );
}
