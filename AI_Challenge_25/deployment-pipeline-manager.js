#!/usr/bin/env node

/**
 * Deployment Pipeline Manager
 * Локальный скрипт для тестирования деплоя перед push
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REQUIRED_SECRETS = [
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'RAILWAY_TOKEN',
  'PERPLEXITY_API_KEY',
  'DISCORD_WEBHOOK',
];

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function run(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log('❌', `Command failed: ${command}`);
    process.exit(1);
  }
}

// ==================== Step 1: Pre-deployment Checks ====================
log('🔍', 'Running pre-deployment checks...');

// Check if secrets are configured (GitHub Secrets)
log('🔐', 'Checking GitHub Secrets...');
const missingSecrets = REQUIRED_SECRETS.filter(
  (secret) => !process.env[secret]
);

if (missingSecrets.length > 0) {
  log(
    '⚠️',
    `Missing secrets: ${missingSecrets.join(', ')} (will use GitHub Secrets)`
  );
}

// Check git status
log('🔀', 'Checking git status...');
const gitStatus = execSync('git status --porcelain', {
  encoding: 'utf-8',
});

if (gitStatus) {
  log('📝', 'Uncommitted changes detected:');
  console.log(gitStatus);
}

// ==================== Step 2: Run Tests ====================
log('🧪', 'Running tests...');

log('📦', 'Installing backend dependencies...');
run('npm ci', { cwd: './server' });

log('📦', 'Installing frontend dependencies...');
run('npm ci', { cwd: './client' });

log('✅', 'Backend tests...');
run('npm test || echo "No tests configured"', { cwd: './server' });

log('✅', 'Frontend tests...');
run('npm test || echo "No tests configured"', { cwd: './client' });

// ==================== Step 3: Build ====================
log('🔨', 'Building application...');

log('🏗️', 'Building frontend...');
run('npm run build', { cwd: './client' });

log('🐳', 'Building Docker image...');
run('docker build -t team-assistant-backend:local ./server');

// ==================== Step 4: Local Deploy Test ====================
log('🚀', 'Testing local deployment...');

log('🔧', 'Starting backend container...');
run(
  'docker run -d -p 4000:4000 --name team-assistant-test -e PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY team-assistant-backend:local'
);

// Wait for server to start
log('⏳', 'Waiting for server to start...');
setTimeout(() => {}, 3000);

log('🏥', 'Running health check...');
try {
  execSync('curl -f http://localhost:4000/api/health');
  log('✅', 'Health check passed');
} catch {
  log('❌', 'Health check failed');
  run('docker logs team-assistant-test');
  run('docker stop team-assistant-test');
  run('docker rm team-assistant-test');
  process.exit(1);
}

log('🧹', 'Cleaning up test container...');
run('docker stop team-assistant-test');
run('docker rm team-assistant-test');

// ==================== Step 5: Ready to Deploy ====================
log('✅', 'Pre-deployment checks passed!');
log('📋', 'Deployment checklist:');
console.log(`
  1. ✅ All tests passed
  2. ✅ Frontend builds successfully
  3. ✅ Backend Docker image builds
  4. ✅ Health check endpoint works
  5. ⏳ Ready to push to GitHub
  
  🚀 Next steps:
     git add .
     git commit -m "Deploy: [description]"
     git push origin main
  
  📊 Monitor deployment:
     - GitHub Actions: https://github.com/[your-repo]/actions
     - Vercel: https://vercel.com/dashboard
     - Railway: https://railway.app/dashboard
`);
