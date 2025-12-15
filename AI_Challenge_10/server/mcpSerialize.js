export function serializeGithubMcpResult(toolName, mcpResult) {
  const items = (mcpResult.content || []).map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    }
    if (block.type === 'resource') {
      const r = block.resource || {};
      return {
        type: 'resource',
        uri: r.uri || null,
        mimeType: r.mimeType || null,
        textPreview: r.text ? r.text.slice(0, 2000) : null,
      };
    }
    return { type: block.type, ...block };
  });

  return {
    source: 'github-mcp',
    tool: toolName,
    createdAt: new Date().toISOString(),
    items,
  };
}
