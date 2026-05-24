import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { InternationalTrack } from '../types';
import { useAuth } from './AuthContext';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Новая',    cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'В работе', cls: 'bg-blue-100 text-blue-700' },
  done:        { label: 'Завершён', cls: 'bg-green-100 text-green-700' },
  paused:      { label: 'На паузе', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function Tracks() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<InternationalTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });

  async function load() {
    try { setTracks(await api.getInternationalTracks()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: InternationalTrack) {
    setEditId(t.id);
    setEditForm({ status: t.status, notes: t.notes || '' });
  }

  async function saveEdit() {
    if (!editId) return;
    await api.updateTrack(editId, editForm);
    setEditId(null);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Загрузка...</div>;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Международные треки</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ключевые партнёры и международные инициативы</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Партнёр / Проект</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Направление</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ответственный</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Заметки</th>
              {user?.role === 'head' && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {tracks.map(t => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                {editId === t.id ? (
                  <>
                    <td className="px-5 py-3 font-medium">{t.partner_name}</td>
                    <td className="px-5 py-3 text-gray-500">{t.direction_name}</td>
                    <td className="px-5 py-3 text-gray-500">{t.responsible_name}</td>
                    <td className="px-5 py-3">
                      <select className="select text-xs w-32" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="new">Новая</option>
                        <option value="in_progress">В работе</option>
                        <option value="paused">На паузе</option>
                        <option value="done">Завершён</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input className="input text-xs" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Заметки..." />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs py-1 px-2" onClick={saveEdit}>Сохранить</button>
                        <button className="btn-secondary text-xs py-1 px-2" onClick={() => setEditId(null)}>Отмена</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-3 font-medium text-gray-900">{t.partner_name}</td>
                    <td className="px-5 py-3 text-gray-500">{t.direction_name}</td>
                    <td className="px-5 py-3 text-gray-600">{t.responsible_name}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${(STATUS_MAP[t.status] || STATUS_MAP.new).cls}`}>
                        {(STATUS_MAP[t.status] || STATUS_MAP.new).label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{t.notes || '—'}</td>
                    {user?.role === 'head' && (
                      <td className="px-5 py-3">
                        <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => startEdit(t)}>Изменить</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
