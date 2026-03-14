import { VercelRequest, VercelResponse } from '@vercel/node';
import app from './api/index';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
