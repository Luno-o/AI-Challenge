import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

dotenv.config();

export async function reviewPullRequest(baseBranch, compareBranch) {
  try {
    console.log(`?? Reviewing ${baseBranch}...${compareBranch}`);

    // 1. Получаем diff
    const diff = execSync(`git diff ${baseBranch}...${compareBranch}`, { encoding: 'utf-8' });
    
    if (!diff || diff.trim().length === 0) {
      return {
        success: true,
        baseBranch,
        compareBranch,
        filesCount: 0,
        summary: '? No changes detected between branches',
        fileReviews: []
      };
    }

    // 2. Парсим diff по файлам
    const files = diff.split('diff --git').filter(Boolean);
    console.log(`?? Found ${files.length} changed files`);

    // 3. Готовим prompt для AI
    const prompt = `You are a senior code reviewer. Analyze this Pull Request:

**Base:** ${baseBranch}
**Compare:** ${compareBranch}
**Files changed:** ${files.length}

\`\`\`diff
${diff.substring(0, 8000)}
\`\`\`

Provide:
1. **Summary** (2-3 sentences)
2. **Per-file review** for top 5 files (? positives, ?? concerns, ?? bugs)

Format:
## Summary
...

## File: path/to/file.js
? ...
?? ...
`;

    // 4. Вызываем Perplexity AI
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a professional code reviewer.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No review generated';

    // 5. Парсим ответ AI
    const summaryMatch = aiResponse.match(/##\s*Summary\s*\n([\s\S]*?)(?=##|$)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : aiResponse.substring(0, 500);

    const fileReviews = [];
    const fileMatches = aiResponse.matchAll(/##\s*File:\s*([^\n]+)\n([\s\S]*?)(?=##|$)/gi);
    
    for (const match of fileMatches) {
      fileReviews.push({
        file: match[1].trim(),
        status: 'M',
        review: match[2].trim()
      });
    }

    return {
      success: true,
      baseBranch,
      compareBranch,
      filesCount: files.length,
      summary,
      fileReviews: fileReviews.slice(0, 5)
    };

  } catch (error) {
    console.error('? Review error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
