import type { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';

export async function getOpenIssuesCount(
  client: McpClient,
  params?: { owner?: string; repo?: string }
) {
  const res = await client.callTool('list_issues', {
    state: 'open',
    owner: params?.owner,
    repo: params?.repo,
  });

  const text = res.contents?.[0]?.text ?? '[]';
  return { raw: res, text };
}

export async function createIssue(
  client: McpClient,
  params: { title: string; body?: string; owner?: string; repo?: string }
) {
  const res = await client.callTool('create_issue', {
    title: params.title,
    body: params.body,
    owner: params.owner,
    repo: params.repo,
  });

  const text = res.contents?.[0]?.text ?? '';
  return { raw: res, text };
}
