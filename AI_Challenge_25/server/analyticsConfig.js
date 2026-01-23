export const ANALYTICS_SOURCES = {
  csv: { path: process.env.ANALYTICS_CSV || 'data/events.csv', columns: ['timestamp', 'level', 'message', 'user_id', 'route', 'status_code'] },
  logs: { path: process.env.ANALYTICS_LOGS || 'data/errors.log' },
  json: { path: process.env.ANALYTICS_JSON || 'data/funnel.json' }
};
