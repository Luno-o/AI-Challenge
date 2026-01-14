
import dotenv from 'dotenv';
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'Luno-o/AI-Challenge';

export async function listPullRequests(state = 'open') {
  try {
    const [owner, repo] = GITHUB_REPO.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}`;
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const prs = await response.json();
    
    return {
      success: true,
      count: prs.length,
      pulls: prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        created: pr.created_at,
        url: pr.html_url,
        base: pr.base.ref,
        head: pr.head.ref
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getPullRequest(prNumber) {
  try {
    const [owner, repo] = GITHUB_REPO.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const pr = await response.json();
    
    return {
      success: true,
      pr: {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        author: pr.user.login,
        created: pr.created_at,
        updated: pr.updated_at,
        url: pr.html_url,
        base: pr.base.ref,
        head: pr.head.ref,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
