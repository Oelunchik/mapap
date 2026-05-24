import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Task, User, Direction, TaskType } from '../types';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { useAuth } from '../pages/AuthContext';

interface Props {
  taskId?: number;
  onClose: () => void;
  onSaved: () => void;
  defaultAssigneeId?: number;
}

const STATUS_OPTIONS = [
  { value: 'new',         label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review',      label: 'На проверке' },
  { value: 'done',        label: 'Готово' },
  { value: 'blocked',     label: 'Заблокировано' },
];

export default function TaskModal({ taskId, onClose, onSaved, defaultAssigneeId }: Props) {
  const { user } = useAuth();
  const isNew = !taskId;

  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignee_id: defaultAssigneeId || user?.id || 0,
    direction_id: 0,
    task_type_id: 0,
    priority: 2,
    status: 'new',
    due_date: '',
    is_urgent: false,
  });

  const [statusComment, setStatusComment] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [tab, setTab] = useState<'details' | 'history' | 'subtasks'>('details');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [u, d, tt] = await Promise.all([
          api.getUsers(),
          api.getDirections(),
          api.getTaskTypes(),
        ]);
        setUsers(u);
        setDirections(d);
        setTaskTypes(tt);
        if (d.length && !form.direction_id) setForm(f => ({ ...f, direction_id: d[0].id }));
        if (tt.length && !form.task_type_id) setForm(f => ({ ...f, task_type_id: tt[0].id }));

        if (taskId) {
          const t = await api.getTask(taskId);
          setTask(t);
          setForm({
            title: t.title,
            description: t.description || '',
            assignee_id: t.assignee_id,
            direction_id: t.direction_id,
            task_type_id: t.task_type_id,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date ? t.due_date.slice(0, 10) : '',
            is_urgent: t.is_urgent,
          });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  async function handleSave() {
    if (!form.title.trim()) { setError('Название обязательно'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        due_date: form.due_date || undefined,
      };
      if (isNew) {
        await api.createTask(payload);
      } else {
        await api.updateTask(taskId!, payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!newStatus) return;
    if (newStatus === 'blocked' && !statusComment.trim()) {
      setError('Комментарий обязателен при блокировке');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateStatus(taskId!, newStatus, statusComment || undefined);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isNew ? 'Новая задача' : 'Редактировать задачу'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 py-12">Загрузка...</div>
        ) : (
          <>
            {/* Tabs (only for existing tasks) */}
            {!isNew && (
              <div className="flex border-b px-6">
                {(['details', 'history', 'subtasks'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'details' ? 'Детали' : t === 'history' ? 'История' : `Подзадачи (${task?.subtasks?.length || 0})`}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

              {tab === 'details' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                    <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Название задачи" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                    <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Дополнительные детали..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {user?.role === 'head' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель</label>
                        <select className="select" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: Number(e.target.value) }))}>
                          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Направление</label>
                      <select className="select" value={form.direction_id} onChange={e => setForm(f => ({ ...f, direction_id: Number(e.target.value) }))}>
                        {directions.map(d => <option key={d.id} value={d.id}>{d.name_ru}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                      <select className="select" value={form.task_type_id} onChange={e => setForm(f => ({ ...f, task_type_id: Number(e.target.value) }))}>
                        {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name_ru}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                      <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}>
                        <option value={1}>🔴 Высокий</option>
                        <option value={2}>🟡 Средний</option>
                        <option value={3}>Низкий</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Срок</label>
                      <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" id="urgent" checked={form.is_urgent} onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                      <label htmlFor="urgent" className="text-sm text-gray-700">Срочная</label>
                    </div>
                  </div>

                  {/* Status change section (only for existing tasks) */}
                  {!isNew && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">Текущий статус:</span>
                        <StatusBadge status={form.status} />
                      </div>
                      {!changingStatus ? (
                        <button className="btn-secondary text-xs" onClick={() => setChangingStatus(true)}>Изменить статус</button>
                      ) : (
                        <div className="space-y-2">
                          <select className="select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                            <option value="">— выбрать —</option>
                            {STATUS_OPTIONS.filter(s => s.value !== form.status).map(s =>
                              (s.value !== 'done' || user?.role === 'head') && (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              )
                            )}
                          </select>
                          {newStatus === 'blocked' && (
                            <input className="input" placeholder="Причина блокировки *" value={statusComment} onChange={e => setStatusComment(e.target.value)} />
                          )}
                          <div className="flex gap-2">
                            <button className="btn-primary text-xs" onClick={handleStatusChange} disabled={!newStatus || saving}>Применить</button>
                            <button className="btn-secondary text-xs" onClick={() => setChangingStatus(false)}>Отмена</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {tab === 'history' && (
                <div className="space-y-3">
                  {!task?.history?.length ? (
                    <p className="text-gray-400 text-sm">История изменений пуста</p>
                  ) : task.history.map(h => (
                    <div key={h.id} className="flex gap-3 text-sm">
                      <div className="w-1 bg-blue-200 rounded shrink-0 mt-1" />
                      <div>
                        <div className="font-medium text-gray-700">{h.changed_by_name}</div>
                        <div className="text-gray-500">
                          <StatusBadge status={h.old_status} /> → <StatusBadge status={h.new_status} />
                        </div>
                        {h.comment && <div className="text-gray-600 mt-0.5">{h.comment}</div>}
                        <div className="text-gray-400 text-xs mt-0.5">{formatDate(h.changed_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'subtasks' && (
                <div className="space-y-2">
                  {!task?.subtasks?.length ? (
                    <p className="text-gray-400 text-sm">Подзадачи отсутствуют</p>
                  ) : task.subtasks.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium text-gray-800">{s.title}</span>
                      <div className="flex gap-2">
                        <PriorityBadge priority={s.priority} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {tab === 'details' && (
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button className="btn-secondary" onClick={onClose}>Отмена</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
