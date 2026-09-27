import express from 'express';
import { apiRouter } from '../src/server/routes.ts';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiRouter);

export default function handler(req: any, res: any) {
  return app(req, res);
}
