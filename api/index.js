process.env.SERVERLESS = '1';
process.env.VERCEL = '1';

let cachedApp = null;
let initPromise = null;

export default async function handler(req, res) {
  if (!cachedApp) {
    if (!initPromise) {
      initPromise = (async () => {
        const serverMod = await import('../dist/server.cjs');
        const server = serverMod.default || serverMod;
        const app = server.app || server;
        const configureRoutes = server.configureRoutes;
        if (typeof configureRoutes === 'function') {
          await configureRoutes(app);
        }
        cachedApp = app;
      })();
    }
    await initPromise;
  }
  return cachedApp(req, res);
}
