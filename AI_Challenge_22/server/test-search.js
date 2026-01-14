// test-search.js
import { searchInIndex } from './ragMcpClient.js';

async function testSearch() {
  console.log('🧪 Testing search...\n');
  
  const queries = [
    'На каком порту работает API сервер?',
    'API server port',
    'порт 4000'
  ];
  
  for (const query of queries) {
    console.log(`\n🔍 Query: "${query}"`);
    try {
      const results = await searchInIndex('docs_index', query, 5);
      
      console.log(`✅ Found ${results.length} results:`);
      results.forEach((r, i) => {
        console.log(`  ${i+1}. [${r.score.toFixed(3)}] ${r.file_path}`);
        console.log(`     Preview: ${r.text.substring(0, 80)}...`);
      });
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  process.exit(0);
}

testSearch();
