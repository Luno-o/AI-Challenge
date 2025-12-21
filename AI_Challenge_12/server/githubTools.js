import { callGithubTool } from './mcpClient.js';

const DEFAULT_OWNER = process.env.GH_DEFAULT_OWNER;
const DEFAULT_REPO = process.env.GH_DEFAULT_REPO;

export async function getRepoInfo({ owner, repo }) {
  try {
    return await callGithubTool('get_repo_info', {
      owner: owner || DEFAULT_OWNER,
      repo: repo || DEFAULT_REPO
    });
  } catch (error) {
    console.error('❌ getRepoInfo failed:', error.message);
    return { error: error.message };
  }
}

export async function listIssues({ owner, repo, state = 'open', per_page = 10 }) {
  try {
    return await callGithubTool('list_issues', {
      owner: owner || DEFAULT_OWNER,
      repo: repo || DEFAULT_REPO,
      state,
      per_page
    });
  } catch (error) {
    console.error('❌ listIssues failed:', error.message);
    return [];  // Возвращаем пустой массив при ошибке
  }
}

export async function listCommits({ owner, repo, per_page = 20 }) {
  try {
    return await callGithubTool('list_commits', {
      owner: owner || DEFAULT_OWNER,
      repo: repo || DEFAULT_REPO,
      per_page
    });
  } catch (error) {
    console.error('❌ listCommits failed:', error.message);
    return [];
  }
}

export async function listBranches({ owner, repo }) {
  try {
    return await callGithubTool('list_branches', {
      owner: owner || DEFAULT_OWNER,
      repo: repo || DEFAULT_REPO
    });
  } catch (error) {
    console.error('❌ listBranches failed:', error.message);
    return [];
  }
}

export async function listPullRequests({ owner, repo, state = 'open' }) {
  try {
    return await callGithubTool('list_prs', {
      owner: owner || DEFAULT_OWNER,
      repo: repo || DEFAULT_REPO,
      state
    });
  } catch (error) {
    console.error('❌ listPullRequests failed:', error.message);
    return [];
  }
}
