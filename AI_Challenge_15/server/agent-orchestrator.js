import { callTaskTool } from './mcpClient.js';
import { callGitHubTool } from './mcpClient.js';
import { callDockerTool } from './mcpClient.js';

export async function orchestrateSummaryChain() {
  console.log('\n🎭 ===== SUMMARY CHAIN STARTED =====');
  try {
    const tasksResult = await callTaskTool('list_tasks', {});
    if (!tasksResult.success) throw new Error('Failed to fetch tasks');
    const tasks = tasksResult.tasks;
    console.log(`✅ Fetched ${tasks.length} tasks`);

    const summaryResult = await callGitHubTool('summarize_tasks_to_file', { tasks });
    if (!summaryResult.success) throw new Error(`Summary failed: ${summaryResult.error}`);
    const { filename, filepath, taskCount } = summaryResult;
    console.log(`✅ Summary saved: ${filename}`);

    const pushResult = await callGitHubTool('push_to_github', { filename, filepath, taskCount });
    if (!pushResult.success) throw new Error(`Push failed: ${pushResult.error}`);
    console.log(`✅ Pushed to GitHub`);

    return {
      success: true,
      steps: [
        { step: 1, description: "Fetch tasks", status: "completed", count: tasks.length },
        { step: 2, description: "Generate summary", status: "completed", file: filename },
        { step: 3, description: "Push to GitHub", status: "completed", url: pushResult.url }
      ]
    };
  } catch (error) {
    console.error(`❌ CHAIN FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 🆕 ЦЕПОЧКА 1: Подготовка тестового окружения
export async function orchestrateSetupTestEnv() {
  console.log('\n🎭 ===== SETUP TEST ENV CHAIN STARTED =====');
  try {
    // STEP 1: Создать задачу
    console.log('📍 STEP 1: Creating setup task...');
    const taskResult = await callTaskTool('create_task', {
      title: 'Setup Test Environment',
      description: 'Initializing PostgreSQL and Redis for testing',
      priority: 'high'
    });
    const taskId = taskResult.task.id;
    console.log(`✅ Task created: ${taskId}`);

    // STEP 2: Создать окружение в Docker
    console.log('\n📍 STEP 2: Creating Docker test environment...');
    const dockerResult = await callDockerTool('create_test_env', {
      postgres_version: '16',
      redis_version: '7',
      postgres_password: process.env.POSTGRES_PASSWORD || 'testpass123'
    });
    if (!dockerResult.success) throw new Error(`Docker failed: ${dockerResult.error}`);
    const { postgres, redis } = dockerResult.environment;
    console.log(`✅ Docker environment created`);
    console.log(`   PostgreSQL: ${postgres.id.substring(0, 12)} on port ${postgres.port}`);
    console.log(`   Redis: ${redis.id.substring(0, 12)} on port ${redis.port}`);

    // STEP 3: Health checks
    console.log('\n📍 STEP 3: Running health checks...');
    const pgHealthResult = await callDockerTool('health_check', {
      container: postgres.id,
      max_wait: 30,
      retries: 3
    });
    const redisHealthResult = await callDockerTool('health_check', {
      container: redis.id,
      max_wait: 30,
      retries: 3
    });

    if (!pgHealthResult.success || !redisHealthResult.success) {
      throw new Error('Health checks failed');
    }
    console.log(`✅ All services healthy`);

    // STEP 4: Обновить задачу
    console.log('\n📍 STEP 4: Updating task...');
    await callTaskTool('update_task', {
      id: taskId,
      status: 'done',
      description: `Test environment ready\nPostgreSQL: ${postgres.id.substring(0, 12)} (port 5432)\nRedis: ${redis.id.substring(0, 12)} (port 6379)`
    });
    console.log(`✅ Task updated`);

    // STEP 5: Логирование в GitHub
    console.log('\n📍 STEP 5: Creating GitHub summary...');
    const summaryResult = await callGitHubTool('summarize_tasks_to_file', {
      tasks: [
        {
          id: taskId,
          title: 'Setup Test Environment',
          status: 'done',
          description: `PostgreSQL (${postgres.id.substring(0, 12)}) and Redis (${redis.id.substring(0, 12)}) running`
        }
      ]
    });
    console.log(`✅ GitHub summary created`);

    console.log('\n🎭 ===== SETUP TEST ENV CHAIN COMPLETED =====\n');
    return {
      success: true,
      environment: {
        postgres: { id: postgres.id, port: 5432, password: postgres.password },
        redis: { id: redis.id, port: 6379 }
      },
      task_id: taskId,
      github_summary: summaryResult.filename
    };
  } catch (error) {
    console.error(`❌ CHAIN FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 🆕 ЦЕПОЧКА 2: Развёртывание приложения
export async function orchestrateDeployApp(dockerfilePath, appName, port, env = {}) {
  console.log('\n🎭 ===== DEPLOY APP CHAIN STARTED =====');
  try {
    // STEP 1: Создать задачу мониторинга
    console.log('📍 STEP 1: Creating monitoring task...');
    const taskResult = await callTaskTool('create_task', {
      title: `Monitor ${appName}`,
      description: `Deployment task for ${appName} on port ${port}`,
      priority: 'high'
    });
    const taskId = taskResult.task.id;
    console.log(`✅ Monitoring task created: ${taskId}`);

    // STEP 2: Deploy приложение
    console.log('\n📍 STEP 2: Deploying application...');
    const deployResult = await callDockerTool('deploy_app', {
      dockerfile_path: dockerfilePath,
      app_name: appName,
      port: port,
      env: env,
      memory: '512m'
    });
    if (!deployResult.success) throw new Error(`Deploy failed: ${deployResult.error}`);
    const containerId = deployResult.container_id;
    console.log(`✅ Application deployed: ${containerId.substring(0, 12)}`);

    // STEP 3: Получить логи
    console.log('\n📍 STEP 3: Retrieving application logs...');
    const logsResult = await callDockerTool('get_logs', {
      container: containerId,
      tail: 50,
      save_to_file: true
    });
    console.log(`✅ Logs saved to ${logsResult.file}`);

    // STEP 4: Обновить задачу
    console.log('\n📍 STEP 4: Updating task with deployment info...');
    await callTaskTool('update_task', {
      id: taskId,
      status: 'in-progress',
      description: `${appName} running\nContainer: ${containerId.substring(0, 12)}\nURL: http://localhost:${port}\nLogs: ${logsResult.file}`
    });
    console.log(`✅ Task updated`);

    console.log('\n🎭 ===== DEPLOY APP CHAIN COMPLETED =====\n');
    return {
      success: true,
      deployment: {
        app_name: appName,
        container_id: containerId,
        url: `http://localhost:${port}`,
        logs_file: logsResult.file
      },
      task_id: taskId
    };
  } catch (error) {
    console.error(`❌ CHAIN FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 🆕 ЦЕПОЧКА 3: Очистка окружения
export async function orchestrateCleanupEnvironment() {
  console.log('\n🎭 ===== CLEANUP ENV CHAIN STARTED =====');
  try {
    // STEP 1: Получить docker-related задачи
    console.log('📍 STEP 1: Fetching docker-related tasks...');
    const tasksResult = await callTaskTool('list_tasks', {});
    if (!tasksResult.success) throw new Error('Failed to fetch tasks');
    
    // Фильтруем задачи связанные с Docker (содержат ключевые слова)
    const dockerTasks = tasksResult.tasks.filter(t => 
      t.description?.includes('container') || 
      t.description?.includes('Container') ||
      t.title?.includes('Setup') ||
      t.title?.includes('Deploy')
    );
    console.log(`✅ Found ${dockerTasks.length} docker-related tasks`);

    // STEP 2: Получить все контейнеры и остановить их
    console.log('\n📍 STEP 2: Stopping and removing containers...');
    const listResult = await callDockerTool('list_containers', { all: true });
    if (!listResult.success) throw new Error('Failed to list containers');

    let removedCount = 0;
    for (const container of listResult.containers) {
      try {
        await callDockerTool('stop_container', { container: container.id, timeout: 5 });
        await callDockerTool('remove_container', { container: container.id, force: true });
        removedCount++;
        console.log(`✅ Removed ${container.name}`);
      } catch (error) {
        console.log(`⚠️ Error removing ${container.name}: ${error.message}`);
      }
    }
    console.log(`✅ Removed ${removedCount} containers`);

    // STEP 3: Архивировать docker задачи
    console.log('\n📍 STEP 3: Archiving docker tasks...');
    for (const task of dockerTasks) {
      await callTaskTool('update_task', {
        id: task.id,
        status: 'done',
        description: `[ARCHIVED] ${task.description}`
      });
    }
    console.log(`✅ Archived ${dockerTasks.length} tasks`);

    // STEP 4: Создать cleanup summary в GitHub
    console.log('\n📍 STEP 4: Creating cleanup summary in GitHub...');
    const summaryResult = await callGitHubTool('summarize_tasks_to_file', {
      tasks: dockerTasks.map(t => ({ ...t, status: 'archived' }))
    });
    const pushResult = await callGitHubTool('push_to_github', {
      filename: summaryResult.filename,
      filepath: summaryResult.filepath,
      taskCount: dockerTasks.length
    });
    console.log(`✅ Cleanup summary pushed to GitHub`);

    console.log('\n🎭 ===== CLEANUP ENV CHAIN COMPLETED =====\n');
    return {
      success: true,
      cleanup: {
        containers_removed: removedCount,
        tasks_archived: dockerTasks.length,
        github_summary: pushResult.branch
      }
    };
  } catch (error) {
    console.error(`❌ CHAIN FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}
