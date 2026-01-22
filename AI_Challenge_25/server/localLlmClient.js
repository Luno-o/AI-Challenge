// server/localLlmClient.js
import axios from 'axios';

class LocalLlmClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    // ✅ Используем модель, которая реально установлена
    this.model = process.env.OLLAMA_MODEL || 'gemma3:4b';
  }

  /**
   * Отправка запроса к локальной LLM
   * @param {string} prompt - Текст запроса
   * @param {Object} options - Дополнительные параметры
   * @returns {Promise<string>} - Ответ модели
   */
  async chat(prompt, options = {}) {
    try {
      console.log(`[Local LLM] Sending to ${this.baseUrl}/api/generate with model ${this.model}`);
      
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
 num_predict: 200  // ✅ Ограничение токенов для скорости
          }
        },
        {
          timeout: 300000, // 30 секунд таймаут
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Local LLM] Response:', response.data);
      return response.data.response;
    } catch (error) {
      console.error('[Local LLM] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: `${this.baseUrl}/api/generate`
      });
      throw new Error(`Failed to query local LLM: ${error.message}`);
    }
  }

  /**
   * Проверка доступности LLM
   */
  async healthCheck() {
    try {
      const response = await axios.get(this.baseUrl);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Список доступных моделей
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }

  /**
   * Проверка существования модели
   */
  async checkModel(modelName) {
    const models = await this.listModels();
    return models.some(m => m.name === modelName);
  }
}

export default new LocalLlmClient();
