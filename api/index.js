const { app, configureRoutes } = require('../dist/server.cjs');

module.exports = async (req, res) => {
  await configureRoutes(app);
  return app(req, res);
};
