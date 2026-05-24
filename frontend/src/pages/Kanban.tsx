import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Task } from '../types';
import { PriorityBadge } from '../components/StatusBadge';
import TaskModal from '../components/TaskModal';

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'new',         label: 'Новая',          color: 'bg-gray-100' },
  { key: 'in_progress', label: 'В работе',        color: 'bg-blue-100' },
  { key: 'review',      label: 'На проверке',     color: 'bg-yellow-100' },
  { key: 'done',        label: 'Готово',          color: 'bg-green-100' },
  { key: 'blocked',     label: 'Заблокировано',   color: 'bg-red-100' },
];

export default function Kanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await api.getTasks({ parent_only: true }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function byStatus(status: string) {
    return tasks.filter(t => t.status === status);
  }

  async function handleDrop(status: string) {
    if (dragId === null) return;
    const task = tasks.find(t => t.id === dragId);
    if (!task || task.status === status) return;
    try {
      await api.updateStatus(dragId, status);
      setTasks(prev => prev.map(t => t.id === dragId ? { ...t, status: status as Task['status'] } : t));
    } catch {
      /* permission error — ignore, revert visually */
      load();
    }
    setDragId(null);
  }

  function dueColor(d?: string) {
    if (!d) return '';
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'text-red-600';
    if (diff <= 2) return 'text-orange-500';
    return 'text-gray-400';
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Загрузка...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Канбан-доска</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Новая задача</button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colTasks = byStatus(col.key);
            return (
              <div
                key={col.key}
                className="flex flex-col w-64 shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Column header */}
                <div className={`rounded-t-xl px-3 py-2.5 ${col.color} border border-b-0 border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="bg-white text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto bg-gray-50 border border-gray-200 rounded-b-xl p-2 space-y-2">
                  {colTasks.length === 0 && (
                    <div className="text-center text-gray-300 text-xs py-4">Пусто</div>
                  )}
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setSelectedTask(task.id)}
                      className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow select-none ${
                        dragId === task.id ? 'opacity-40' : ''
                      } ${task.priority === 1 ? 'border-l-4 border-l-red-400' : task.priority === 2 ? 'border-l-4 border-l-yellow-400' : ''}`}
                    >
                      <div className="text-sm font-medium text-gray-800 leading-snug mb-2">{task.title}</div>
                      <div className="flex items-center justify-between gap-1 text-xs text-gray-500">
                        <span className="truncate">{task.assignee_name}</span>
                        {task.is_urgent && <span className="text-red-500">⚡</span>}
                      </div>
                      {task.due_date && (
                        <div className={`text-xs mt-1 ${dueColor(task.due_date)}`}>
                          📅 {new Date(task.due_date).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-xs text-gray-400">{task.direction_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <TaskModal taskId={selectedTask} onClose={() => setSelectedTask(null)} onSaved={load} />
      )}
      {showCreate && (
        <TaskModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}
    </div>
  );
}
