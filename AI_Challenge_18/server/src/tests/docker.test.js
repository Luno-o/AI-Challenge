const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';

describe('🐳 Docker Integration Tests', () => {

  // Тест 1: Создание окружения
  test('✅ Setup PostgreSQL + Redis environment', async () => {
    console.log('\n🔄 Creating test environment...');
    
    const response = await axios.post(`${API_BASE}/orchestrate/setup-test-env`);
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.environment.postgres).toBeDefined();
    expect(response.data.environment.redis).toBeDefined();
    
    console.log('✅ Environment created!');
    console.log(`   PostgreSQL: ${response.data.environment.postgres.id.substring(0, 12)}`);
    console.log(`   Redis: ${response.data.environment.redis.id.substring(0, 12)}`);
    console.log(`   Task ID: ${response.data.task_id}`);
  });

  // Тест 2: Список контейнеров
  test('✅ Get containers list', async () => {
    console.log('\n🔄 Fetching containers...');
    
    const response = await axios.get(`${API_BASE}/docker/containers`);
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.containers)).toBe(true);
    
    console.log(`✅ Found ${response.data.count} containers:`);
    response.data.containers.forEach(c => {
      console.log(`   📦 ${c.name} (${c.image}) - ${c.status}`);
    });
  });

  // Тест 3: Очистка
  test('✅ Cleanup environment', async () => {
    console.log('\n🔄 Cleaning up...');
    
    const response = await axios.post(`${API_BASE}/orchestrate/cleanup-env`);
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    console.log('✅ Cleanup done!');
    console.log(`   Containers removed: ${response.data.cleanup.containers_removed}`);
    console.log(`   Tasks archived: ${response.data.cleanup.tasks_archived}`);
  });

  // Тест 4: Chat команда Docker
  test('✅ Chat with Docker command', async () => {
    console.log('\n🔄 Testing chat command...');
    
    const response = await axios.post('http://localhost:4000/api/chat', {
      message: 'подними postgres для тестов',
      conversationHistory: []
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    console.log('✅ Chat response received!');
    console.log(`   Response length: ${response.data.response.length} chars`);
  });
});
