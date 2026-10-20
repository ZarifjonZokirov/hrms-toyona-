import server from '../dist/server.cjs';

const { app, configureRoutes } = server;

export default async function handler(req, res) {
  await configureRoutes(app);
  return app(req, res);
}
