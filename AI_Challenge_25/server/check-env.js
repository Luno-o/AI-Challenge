import dotenv from 'dotenv';
dotenv.config();

console.log('=== ENVIRONMENT CHECK ===\n');

const required = ['PERPLEXITY_API_KEY', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
const optional = ['PORT', 'GITHUB_BRANCH'];

console.log('📋 REQUIRED:');
required.forEach(key => {
  const value = process.env[key];
  const status = value ? '✅' : '❌';
  console.log(`  ${status} ${key}: ${value ? value.substring(0, 10) + '...' : 'MISSING'}`);
});

console.log('\n📋 OPTIONAL:');
optional.forEach(key => {
  const value = process.env[key];
  console.log(`  ${value ? '✅' : '⚠️'} ${key}: ${value || 'default'}`);
});
console.log("PERPLEXITY_API_KEY =", process.env.PERPLEXITY_API_KEY?.slice(0, 10));
console.log("REPO_PATH          =", process.env.REPO_PATH);
console.log("OLLAMA_URL         =", process.env.OLLAMA_URL);
console.log("OLLAMA_MODEL       =", process.env.OLLAMA_MODEL);
console.log('\n=== END CHECK ===');
