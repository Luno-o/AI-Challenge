// server/localLlmClient.js
import axios from 'axios';
import { OLLAMA_MODELS, TASK_PRESETS } from './ollamaConfig.js';
import { SYSTEM_PROMPTS } from './promptTemplates.js';

class LocalLlmClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'gemma2:2b';
    console.log(
      "[Local LLM init] OLLAMA_URL=",
      process.env.OLLAMA_URL,
      "OLLAMA_MODEL=",
      process.env.OLLAMA_MODEL,
      "-> using model",
      this.model
    );
    this.defaultConfig = OLLAMA_MODELS[this.model]?.recommended || {};
  }

  // 🔥 ИСПРАВЛЕННЫЙ метод чата (теперь использует /api/chat)
  async chat(prompt, options = {}) {
    const {
      temperature,
      top_p,
      top_k,
      num_predict,
      repeat_penalty,
      stop,
      system,
      preset,
      timeout = 120000
    } = options;

    // Применяем preset если указан
    const presetConfig = preset ? TASK_PRESETS[preset] : {};

    // Объединяем конфигурации (приоритет: options > preset > default)
    const config = {
      temperature: temperature ?? presetConfig.temperature ?? this.defaultConfig.temperature ?? 0.7,
      top_p: top_p ?? presetConfig.top_p ?? this.defaultConfig.top_p ?? 0.9,
      top_k: top_k ?? presetConfig.top_k ?? this.defaultConfig.top_k ?? 40,
      num_predict: num_predict ?? presetConfig.num_predict ?? this.defaultConfig.num_predict ?? 256,
      repeat_penalty: repeat_penalty ?? presetConfig.repeat_penalty ?? this.defaultConfig.repeat_penalty ?? 1.1,
      ...(stop && { stop })
    };

    const systemPrompt = system ?? presetConfig.system ?? SYSTEM_PROMPTS.assistant;

    console.log(`[Local LLM] Model: ${this.model}, Preset: ${preset || 'none'}, Config:`, config);

    try {
      // 🔥 ИСПОЛЬЗУЕМ /api/chat вместо /api/generate
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: false,
          options: config
        },
        {
          timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // 🔥 Извлекаем ответ из нового формата
      return response.data.message?.content || '';

    } catch (error) {
      console.error('[Local LLM] Error:', error.message);
      throw new Error(`Failed to query local LLM: ${error.message}`);
    }
  }

  // 🔥 ИСПРАВЛЕННЫЙ Streaming ответ
  async *chatStream(prompt, options = {}) {
    const config = this._buildConfig(options);
    const systemPrompt = options.system ?? SYSTEM_PROMPTS.assistant;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: true,
          options: config
        },
        {
          responseType: 'stream',
          timeout: 120000
        }
      );

      for await (const chunk of response.data) {
        const data = JSON.parse(chunk.toString());
        if (data.message?.content) {
          yield data.message.content;
        }
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(this.baseUrl, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Список доступных моделей
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.data.models || [];
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  // Загрузить новую модель
  async pullModel(modelName) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/pull`,
        { name: modelName },
        { timeout: 600000 } // 10 минут на загрузку
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to pull model: ${error.message}`);
    }
  }

  // Получить информацию о модели
  async getModelInfo(modelName = this.model) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/show`,
        { name: modelName },
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  // Сравнить разные конфигурации
  async compareConfigs(prompt, configs) {
    const results = [];
    for (const config of configs) {
      const startTime = Date.now();
      try {
        const response = await this.chat(prompt, config);
        const endTime = Date.now();
        results.push({
          config: config.name || JSON.stringify(config),
          response,
          duration: endTime - startTime,
          success: true
        });
      } catch (error) {
        results.push({
          config: config.name || JSON.stringify(config),
          error: error.message,
          success: false
        });
      }
    }
    return results;
  }

  // Вспомогательный метод для построения конфига
  _buildConfig(options) {
    const { preset, ...customOptions } = options;
    const presetConfig = preset ? TASK_PRESETS[preset] : {};
    return {
      temperature: customOptions.temperature ?? presetConfig.temperature ?? this.defaultConfig.temperature ?? 0.7,
      top_p: customOptions.top_p ?? presetConfig.top_p ?? this.defaultConfig.top_p ?? 0.9,
      top_k: customOptions.top_k ?? presetConfig.top_k ?? this.defaultConfig.top_k ?? 40,
      num_predict: customOptions.num_predict ?? presetConfig.num_predict ?? this.defaultConfig.num_predict ?? 256,
      repeat_penalty: customOptions.repeat_penalty ?? presetConfig.repeat_penalty ?? this.defaultConfig.repeat_penalty ?? 1.1
    };
  }
}

export default new LocalLlmClient();
