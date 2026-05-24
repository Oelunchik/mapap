import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'Не авторизован' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string; email: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ data: null, error: 'Токен недействителен' });
  }
}

export function requireHead(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'head') {
    return res.status(403).json({ data: null, error: 'Доступ запрещён' });
  }
  next();
}
