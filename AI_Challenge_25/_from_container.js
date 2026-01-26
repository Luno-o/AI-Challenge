// server/services/userPersonalizationService.js

const fs = require('fs');
const path = require('path');

class UserPersonalizationService {
  constructor() {
    this.profilesDir = path.join(__dirname, '../userProfiles');
    
    // Убедиться, что директория существует
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
      console.log(`[PersonalizationService] Created profiles directory: ${this.profilesDir}`);
    }
  }

  /**
   * Загрузить профиль пользователя
   * @param {string} user_id - ID пользователя (например: "luno-o")
   * @returns {Object|null} - профиль или null если не найден
   */
  loadProfile(user_id) {
    try {
      const filePath = path.join(this.profilesDir, `${user_id}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`[PersonalizationService] Profile not found: ${user_id}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const profile = JSON.parse(fileContent);
      
      console.log(`[PersonalizationService] Loaded profile: ${user_id}`);
      return profile;
    } catch (error) {
      console.error(`[PersonalizationService] Error loading profile ${user_id}:`, error.message);
      return null;
    }
  }

  /**
   * Сохранить профиль пользователя
   * @param {Object} profile - объект профиля
   * @returns {boolean} - успешно ли сохранено
   */
  saveProfile(profile) {
    try {
      if (!profile.user_id) {
        throw new Error('Profile must have user_id');
      }

      const filePath = path.join(this.profilesDir, `${profile.user_id}.json`);
      const profileJson = JSON.stringify(profile, null, 2);
      
      fs.writeFileSync(filePath, profileJson, 'utf8');
      
      console.log(`[PersonalizationService] Saved profile: ${profile.user_id}`);
      return true;
    } catch (error) {
      console.error('[PersonalizationService] Error saving profile:', error.message);
      return false;
    }
  }

  /**
   * Удалить профиль пользователя
   * @param {string} user_id - ID пользователя
   * @returns {boolean} - успешно ли удалено
   */
  deleteProfile(user_id) {
    try {
      const filePath = path.join(this.profilesDir, `${user_id}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`[PersonalizationService] Profile not found: ${user_id}`);
        return false;
      }

      fs.unlinkSync(filePath);
      
      console.log(`[PersonalizationService] Deleted profile: ${user_id}`);
      return true;
    } catch (error) {
      console.error('[PersonalizationService] Error deleting profile:', error.message);
      return false;
    }
  }

  /**
   * Получить список всех профилей
   * @returns {Array} - массив ID профилей
   */
  listProfiles() {
    try {
      const files = fs.readdirSync(this.profilesDir);
      const profiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
      
      console.log(`[PersonalizationService] Found ${profiles.length} profiles`);
      return profiles;
    } catch (error) {
      console.error('[PersonalizationService] Error listing profiles:', error.message);
      return [];
    }
  }

  /**
   * Построить system prompt из профиля
   * @param {Object} profile - профиль пользователя
   * @returns {string} - system prompt для LLM
   */
  buildSystemPrompt(profile) {
    if (!profile) {
      return `Ты — интеллектуальный ассистент разработчика.
Помогай с технической поддержкой, анализом кода и архитектурой.`;
    }

    let prompt = `Ты — интеллектуальный ассистент разработчика ${profile.name || 'друг'} (${profile.role || 'Developer'}).

`;

    // О пользователе
    if (profile.primaryLanguage || profile.workStyle || profile.preferences) {
      prompt += `📋 **О ${profile.name || 'пользователе'}:**\n`;
      
      if (profile.primaryLanguage) {
        prompt += `- Язык общения: ${profile.primaryLanguage}\n`;
      }
      
      if (profile.workStyle) {
        prompt += `- Стиль работы: ${profile.workStyle}\n`;
      }

      if (profile.preferences) {
        if (profile.preferences.responseStyle) {
          prompt += `- Предпочитаемые ответы: ${profile.preferences.responseStyle}\n`;
        }
        if (profile.preferences.codeLanguages && profile.preferences.codeLanguages.length > 0) {
          prompt += `- Языки программирования: ${profile.preferences.codeLanguages.join(', ')}\n`;
        }
        if (profile.preferences.favoriteTools && profile.preferences.favoriteTools.length > 0) {
          prompt += `- Любимые инструменты: ${profile.preferences.favoriteTools.join(', ')}\n`;
        }
        if (profile.preferences.timeZone) {
          prompt += `- Часовой пояс: ${profile.preferences.timeZone}\n`;
        }
        if (profile.preferences.communicationTone) {
          prompt += `- Тон общения: ${profile.preferences.communicationTone}\n`;
        }
      }
      
      prompt += '\n';
    }

    // Текущий проект
    if (profile.projectContext) {
      prompt += `🎯 **Текущий проект:**\n`;
      
      if (profile.projectContext.currentProject) {
        prompt += `- Название: ${profile.projectContext.currentProject}\n`;
      }
      if (profile.projectContext.techStack && profile.projectContext.techStack.length > 0) {
        prompt += `- Tech Stack: ${profile.projectContext.techStack.join(', ')}\n`;
      }
      
      prompt += '\n';
    }

    // Рекомендации по ответам
    prompt += `⚡ **При ответе учитывай:**\n`;
    
    if (profile.preferences && profile.preferences.responseStyle) {
      prompt += `- ${profile.preferences.responseStyle}\n`;
    } else {
      prompt += `- Давай структурированные, практичные ответы\n`;
    }
    
    if (profile.preferences && profile.preferences.codeLanguages && profile.preferences.codeLanguages.length > 0) {
      prompt += `- Приоритет языков: ${profile.preferences.codeLanguages.slice(0, 3).join(', ')}\n`;
    }
    
    if (profile.preferences && profile.preferences.favoriteTools && profile.preferences.favoriteTools.length > 0) {
      prompt += `- Упоминай ${profile.preferences.favoriteTools.slice(0, 3).join(', ')} в контексте решений\n`;
    }

    return prompt;
  }

  /**
   * Получить system prompt для конкретного запроса
   * @param {string} user_id - ID пользователя
   * @param {string} query - запрос пользователя (опционально для контекста)
   * @returns {string} - полный system prompt
   */
  getSystemPromptForQuery(user_id, query = '') {
    const profile = this.loadProfile(user_id);
    const systemPrompt = this.buildSystemPrompt(profile);
    
    console.log(`[PersonalizationService] Generated system prompt for ${user_id}`);
    return systemPrompt;
  }

  /**
   * Получить метаданные профиля (без полного промпта)
   * @param {string} user_id - ID пользователя
   * @returns {Object} - метаданные профиля
   */
  getProfileMetadata(user_id) {
    const profile = this.loadProfile(user_id);
    
    if (!profile) {
      return null;
    }

    return {
      user_id: profile.user_id,
      name: profile.name,
      role: profile.role,
      primaryLanguage: profile.primaryLanguage,
      preferences: profile.preferences
    };
  }
}

// Export singleton
module.exports = new UserPersonalizationService();
