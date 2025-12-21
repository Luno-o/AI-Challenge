#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN
});

const server = new Server(
  {
    name: "custom-github-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Список инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_repo_info",
        description: "Get repository information",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "list_issues",
        description: "List repository issues",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            state: { type: "string" },
            per_page: { type: "number" }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "list_commits",
        description: "List repository commits",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            per_page: { type: "number" }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "list_branches",
        description: "List repository branches",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" }
          },
          required: ["owner", "repo"]
        }
      },
      {
        name: "list_prs",
        description: "List pull requests",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            state: { type: "string" }
          },
          required: ["owner", "repo"]
        }
      }
    ]
  };
});

// КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Обработчик с обходом Zod
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let { name, arguments: args } = request.params;

  // ОБХОД ZOD: Принудительная десериализация аргументов
  if (args && typeof args === 'object') {
    args = JSON.parse(JSON.stringify(args));
  } else {
    args = {};
  }

  console.error(`📞 MCP: Вызов инструмента ${name}`, args);

  try {
    switch (name) {
      case "get_repo_info": {
        const { data } = await octokit.rest.repos.get({
          owner: args.owner,
          repo: args.repo
        });
        
        const result = {
          name: data.name,
          full_name: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          open_issues: data.open_issues_count,
          language: data.language,
          default_branch: data.default_branch,
          created_at: data.created_at,
          updated_at: data.updated_at,
          url: data.html_url
        };

        console.error(`✅ MCP: get_repo_info успешно`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case "list_issues": {
        const { data } = await octokit.rest.issues.listForRepo({
          owner: args.owner,
          repo: args.repo,
          state: args.state || "open",
          per_page: args.per_page || 10
        });
        
        const issues = data.map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          created_at: issue.created_at,
          labels: issue.labels.map(l => l.name),
          url: issue.html_url
        }));

        console.error(`✅ MCP: list_issues вернул ${issues.length} issues`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(issues, null, 2)
          }]
        };
      }

      case "list_commits": {
        const { data } = await octokit.rest.repos.listCommits({
          owner: args.owner,
          repo: args.repo,
          per_page: args.per_page || 20
        });
        
        const commits = data.map(commit => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          url: commit.html_url
        }));

        console.error(`✅ MCP: list_commits вернул ${commits.length} коммитов`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(commits, null, 2)
          }]
        };
      }

      case "list_branches": {
        const { data } = await octokit.rest.repos.listBranches({
          owner: args.owner,
          repo: args.repo
        });
        
        const branches = data.map(branch => ({
          name: branch.name,
          protected: branch.protected,
          commit_sha: branch.commit.sha.substring(0, 7)
        }));

        console.error(`✅ MCP: list_branches вернул ${branches.length} веток`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(branches, null, 2)
          }]
        };
      }

      case "list_prs": {
        const { data } = await octokit.rest.pulls.list({
          owner: args.owner,
          repo: args.repo,
          state: args.state || "open"
        });
        
        const prs = data.map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          head: pr.head.ref,
          base: pr.base.ref,
          created_at: pr.created_at,
          url: pr.html_url
        }));

        console.error(`✅ MCP: list_prs вернул ${prs.length} PR`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(prs, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`❌ MCP: Ошибка в ${name}:`, error.message);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: error.message }, null, 2)
      }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Custom GitHub MCP Server running");
}

main().catch((error) => {
  console.error("❌ Server startup error:", error);
  process.exit(1);
});
