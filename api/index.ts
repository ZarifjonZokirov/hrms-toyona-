import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, configureRoutes } from '../server';

configureRoutes(app);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
