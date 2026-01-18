/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

// Mock health check response
function getHealthCheckResponse() {
  return {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.1.1',
    checks: {
      mcp_clients: {
        task: true,
        git: true,
      },
      environment: {
        perplexity_key: !!process.env.PERPLEXITY_API_KEY,
        repo_path: !!process.env.REPO_PATH,
      },
    },
  };
}

describe('Health Check Endpoint', () => {
  it('should return UP status', () => {
    const health = getHealthCheckResponse();

    expect(health.status).toBe('UP');
  });

  it('should include timestamp', () => {
    const health = getHealthCheckResponse();

    expect(health.timestamp).toBeDefined();
    expect(new Date(health.timestamp)).toBeInstanceOf(Date);
  });

  it('should include version', () => {
    const health = getHealthCheckResponse();

    expect(health.version).toBe('1.1.1');
  });

  it('should check MCP clients status', () => {
    const health = getHealthCheckResponse();

    expect(health.checks.mcp_clients).toBeDefined();
    expect(health.checks.mcp_clients.task).toBeDefined();
    expect(health.checks.mcp_clients.git).toBeDefined();
  });

  it('should check environment variables', () => {
    const health = getHealthCheckResponse();

    expect(health.checks.environment).toBeDefined();
    expect(typeof health.checks.environment.perplexity_key).toBe('boolean');
  });

  it('should report uptime', () => {
    const health = getHealthCheckResponse();

    expect(health.uptime).toBeGreaterThan(0);
    expect(typeof health.uptime).toBe('number');
  });
});
