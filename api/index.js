process.env.SERVERLESS = '1';
process.env.VERCEL = '1';

import server from './server.cjs';

const app = server.app || server;
const configureRoutes = server.configureRoutes;

let configured = false;

export default async function handler(req, res) {
  if (!configured && typeof configureRoutes === 'function') {
    await configureRoutes(app);
    configured = true;
  }
  return app(req, res);
}
