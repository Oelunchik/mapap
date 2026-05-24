import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { SummaryRow } from '../types';
import { useAuth } from './AuthContext';

interface DirectionRow {
  direction: string;
  total: number;
  done: number;
  in_progress: number;
  overdue: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [byDirection, setByDirection] = useState<DirectionRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      if (user?.role === 'head') {
        const q = await api.getQuarterly();
        setSummary(q.summary);
        setByDirection(q.by_direction);
        setGeneratedAt(q.generated_at);
      } else {
        setSummary(await api.getSummary());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function exportCSV() {
    const rows = [
      ['Сотрудник', 'Всего', 'Высокий', 'Средний', 'В работе', 'Готово'],
      ...summary.map(r => [r.full_name, r.total, r.high_priority, r.medium_priority, r.in_progress, r.done]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapap_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Загрузка...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отчёты</h1>
          {generatedAt && (
            <p className="text-gray-400 text-xs mt-0.5">
              Сформировано: {new Date(generatedAt).toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <button className="btn-secondary" onClick={exportCSV}>⬇ Экспорт CSV</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

      {/* Summary table */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Сводная таблица по сотрудникам</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left pb-3">Сотрудник</th>
                <th className="text-center pb-3">Всего</th>
                <th className="text-center pb-3">🔴 Высокий</th>
                <th className="text-center pb-3">🟡 Средний</th>
                <th className="text-center pb-3">В работе</th>
                <th className="text-center pb-3">Готово</th>
                <th className="text-center pb-3">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(r => {
                const pct = Number(r.total) > 0 ? Math.round((Number(r.done) / Number(r.total)) * 100) : 0;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{r.full_name}</td>
                    <td className="text-center py-3 font-bold text-gray-800">{r.total}</td>
                    <td className="text-center py-3 text-red-600">{r.high_priority}</td>
                    <td className="text-center py-3 text-yellow-600">{r.medium_priority}</td>
                    <td className="text-center py-3 text-blue-600">{r.in_progress}</td>
                    <td className="text-center py-3 text-green-600">{r.done}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-bold border-t-2">
                <td className="py-3">Итого</td>
                <td className="text-center py-3">{summary.reduce((a,r) => a + Number(r.total), 0)}</td>
                <td className="text-center py-3 text-red-600">{summary.reduce((a,r) => a + Number(r.high_priority), 0)}</td>
                <td className="text-center py-3 text-yellow-600">{summary.reduce((a,r) => a + Number(r.medium_priority), 0)}</td>
                <td className="text-center py-3 text-blue-600">{summary.reduce((a,r) => a + Number(r.in_progress), 0)}</td>
                <td className="text-center py-3 text-green-600">{summary.reduce((a,r) => a + Number(r.done), 0)}</td>
                <td className="py-3 px-4 text-xs text-gray-400">
                  {summary.reduce((a,r) => a + Number(r.total), 0) > 0
                    ? Math.round((summary.reduce((a,r) => a + Number(r.done), 0) / summary.reduce((a,r) => a + Number(r.total), 0)) * 100)
                    : 0}% выполнено
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* By direction */}
      {byDirection.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">По направлениям</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byDirection.map(d => (
              <div key={d.direction} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="font-semibold text-gray-800 mb-3">{d.direction}</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Всего задач</span><span className="font-medium">{d.total}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">В работе</span><span className="text-blue-600 font-medium">{d.in_progress}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Готово</span><span className="text-green-600 font-medium">{d.done}</span></div>
                  {d.overdue > 0 && <div className="flex justify-between"><span className="text-gray-500">Просрочено</span><span className="text-red-600 font-medium">{d.overdue}</span></div>}
                </div>
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: d.total > 0 ? `${Math.round((d.done / d.total) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
