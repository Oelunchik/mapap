import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🚦</div>
          <h1 className="text-2xl font-bold text-white">MAPAP</h1>
          <p className="text-blue-200 text-sm mt-1">Проектный офис по транспорту и логистике РК</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Вход в систему</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alua@mapap.kz"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t text-xs text-gray-400">
            <div className="font-medium text-gray-500 mb-1">Тестовые данные:</div>
            <div>alua@mapap.kz / mapap2026</div>
            <div>aray@mapap.kz / mapap2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
