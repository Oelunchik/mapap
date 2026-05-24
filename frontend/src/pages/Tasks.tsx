import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Task, User, Direction } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import TaskModal from '../components/TaskModal';
import { useAuth } from './AuthContext';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    assignee: '',
    direction: '',
    status: '',
    priority: '',
    parent_only: 'true',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {};
      if (filters.assignee)   params.assignee   = Number(filters.assignee);
      if (filters.direction)  params.direction  = filters.direction;
      if (filters.status)     params.status     = filters.status;
      if (filters.priority)   params.priority   = Number(filters.priority);
      if (filters.parent_only === 'true') params.parent_only = true;
      setTasks(await api.getTasks(params));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.getUsers().then(setUsers);
    api.getDirections().then(setDirections);
  }, []);

  useEffect(() => { load(); }, [load]);

  function dueLabel(d?: string) {
    if (!d) return <span className="text-gray-300 text-xs">—</span>;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    const label = new Date(d).toLocaleDateString('ru-RU');
    if (diff < 0) return <span className="text-red-600 text-xs font-medium">{label} ⚠</span>;
    if (diff <= 2) return <span className="text-orange-500 text-xs font-medium">{label}</span>;
    return <span className="text-gray-500 text-xs">{label}</span>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Новая задача</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {user?.role === 'head' && (
          <select className="select w-40" value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}>
            <option value="">Все сотрудники</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        )}
        <select className="select w-44" value={filters.direction} onChange={e => setFilters(f => ({ ...f, direction: e.target.value }))}>
          <option value="">Все направления</option>
          {directions.map(d => <option key={d.id} value={d.code}>{d.name_ru}</option>)}
        </select>
        <select className="select w-40" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Все статусы</option>
          <option value="new">Новая</option>
          <option value="in_progress">В работе</option>
          <option value="review">На проверке</option>
          <option value="done">Готово</option>
          <option value="blocked">Заблокировано</option>
        </select>
        <select className="select w-40" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">Все приоритеты</option>
          <option value="1">🔴 Высокий</option>
          <option value="2">🟡 Средний</option>
          <option value="3">Низкий</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filters.parent_only === 'true'} onChange={e => setFilters(f => ({ ...f, parent_only: e.target.checked ? 'true' : '' }))} className="w-4 h-4 text-blue-600 rounded" />
          Только родительские
        </label>
        {(filters.assignee || filters.direction || filters.status || filters.priority) && (
          <button className="btn-secondary text-xs" onClick={() => setFilters({ assignee: '', direction: '', status: '', priority: '', parent_only: 'true' })}>
            Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка...</div>
        ) : tasks.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Задачи не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Задача</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Исполнитель</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Направление</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Приоритет</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Срок</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t.id)}
                    className="border-b last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 line-clamp-1">{t.title}</div>
                      {t.is_urgent && <span className="text-xs text-red-600 font-medium">⚡ Срочная</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.assignee_name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.direction_name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.task_type_name}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">{dueLabel(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">Показано: {tasks.length} задач</div>

      {selectedTask && (
        <TaskModal taskId={selectedTask} onClose={() => setSelectedTask(null)} onSaved={load} />
      )}
      {showCreate && (
        <TaskModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}
    </div>
  );
}
