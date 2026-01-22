module.exports = {
  apps: [{
    name: 'perplexity-chat-backend',
    script: 'index.js',
    cwd: '/opt/Ai-challenge/AI_Challenge_25/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/opt/Ai-challenge/AI_Challenge_25/server/logs/err.log',
    out_file: '/opt/Ai-challenge/AI_Challenge_25/server/logs/out.log',
    log_file: '/opt/Ai-challenge/AI_Challenge_25/server/logs/combined.log',
    time: true
  }]
};
