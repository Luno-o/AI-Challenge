// Конфигурация моделей Ollama с разными уровнями квантования

export const OLLAMA_MODELS = {
  // Легкие модели (быстро, меньше памяти)
  'gemma2:2b': {
    name: 'gemma2:2b',
    size: '1.6GB',
    quantization: 'Q4_K_M',
    contextWindow: 8192,
    description: 'Быстрая модель для коротких ответов',
    recommended: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      num_predict: 256,
      repeat_penalty: 1.1
    }
  },
  
  // Средние модели (баланс скорости и качества)
  'llama3.2:3b': {
    name: 'llama3.2:3b',
    size: '2.0GB',
    quantization: 'Q4_0',
    contextWindow: 4096,
    description: 'Универсальная модель для большинства задач',
    recommended: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      num_predict: 512,
      repeat_penalty: 1.1
    }
  },

  // Мощные модели (высокое качество, медленнее)
  'mistral:7b': {
    name: 'mistral:7b',
    size: '4.1GB',
    quantization: 'Q4_0',
    contextWindow: 8192,
    description: 'Качественные ответы для сложных задач',
    recommended: {
      temperature: 0.8,
      top_p: 0.95,
      top_k: 50,
      num_predict: 1024,
      repeat_penalty: 1.15
    }
  },

  // Квантованные версии для экономии памяти
  'llama3.2:3b-q2': {
    name: 'llama3.2:3b',
    size: '1.2GB',
    quantization: 'Q2_K',
    contextWindow: 4096,
    description: 'Максимально легкая (низкое качество)',
    recommended: {
      temperature: 0.6,
      top_p: 0.85,
      top_k: 30,
      num_predict: 256,
      repeat_penalty: 1.2
    }
  }
};

// Presets для разных задач
export const TASK_PRESETS = {
  // Для кода
  coding: {
    temperature: 0.2,
    top_p: 0.9,
    top_k: 40,
    num_predict: 2048,
    repeat_penalty: 1.0,
    stop: ['```\n', '\n\n\n']
  },

  // Для креативных задач
  creative: {
    temperature: 0.9,
    top_p: 0.95,
    top_k: 60,
    num_predict: 1024,
    repeat_penalty: 1.1
  },

  // Для точных ответов
  factual: {
    temperature: 0.3,
    top_p: 0.85,
    top_k: 30,
    num_predict: 512,
    repeat_penalty: 1.15
  },

  // Для чата
  chat: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    num_predict: 256,
    repeat_penalty: 1.1
  },

  // Для анализа задач (Team Assistant)
  task_analysis: {
    temperature: 0.5,
    top_p: 0.9,
    top_k: 40,
    num_predict: 512,
    repeat_penalty: 1.1,
    system: 'Ты помощник для анализа задач разработки. Отвечай структурированно и по делу.'
  }
};

export default {
  OLLAMA_MODELS,
  TASK_PRESETS
};