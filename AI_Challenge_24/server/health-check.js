// Добавить в server/index.js

// Health check endpoint для CI/CD
app.get('/api/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.1.1',
    checks: {
      mcp_clients: {
        task: !!taskClient,
        git: !!gitClient,
      },
      environment: {
        perplexity_key: !!process.env.PERPLEXITY_API_KEY,
        repo_path: !!process.env.REPO_PATH,
      },
    },
  };

  const isHealthy =
    health.checks.environment.perplexity_key &&
    health.checks.environment.repo_path;

  res.status(isHealthy ? 200 : 503).json(health);
});
