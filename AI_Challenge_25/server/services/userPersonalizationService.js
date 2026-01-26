// server/userPersonalizationService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserPersonalizationService {
  constructor() {
    this.profilesDir = path.join(__dirname, './userProfiles');
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
      console.log(`[PersonalizationService] Created profiles directory: ${this.profilesDir}`);
    }
  }

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

  buildSystemPrompt(profile) {
    if (!profile) {
      return `Ты — интеллектуальный ассистент разработчика.
Помогай с технической поддержкой, анализом кода и архитектурой.`;
    }

    let prompt = `Ты — интеллектуальный ассистент разработчика ${profile.name || 'друг'} (${profile.role || 'Developer'}).
`;

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
        if (profile.preferences.codeLanguages?.length) {
          prompt += `- Языки программирования: ${profile.preferences.codeLanguages.join(', ')}\n`;
        }
        if (profile.preferences.favoriteTools?.length) {
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

    if (profile.projectContext) {
      prompt += `🎯 **Текущий проект:**\n`;
      if (profile.projectContext.currentProject) {
        prompt += `- Название: ${profile.projectContext.currentProject}\n`;
      }
      if (profile.projectContext.techStack?.length) {
        prompt += `- Tech Stack: ${profile.projectContext.techStack.join(', ')}\n`;
      }
      prompt += '\n';
    }

    prompt += `⚡ **При ответе учитывай:**\n`;
    if (profile.preferences?.responseStyle) {
      prompt += `- ${profile.preferences.responseStyle}\n`;
    } else {
      prompt += `- Давай структурированные, практичные ответы\n`;
    }
    if (profile.preferences?.codeLanguages?.length) {
      prompt += `- Приоритет языков: ${profile.preferences.codeLanguages.slice(0, 3).join(', ')}\n`;
    }
    if (profile.preferences?.favoriteTools?.length) {
      prompt += `- Упоминай ${profile.preferences.favoriteTools.slice(0, 3).join(', ')} в контексте решений\n`;
    }

    return prompt;
  }

  getSystemPromptForQuery(user_id, query = '') {
    const profile = this.loadProfile(user_id);
    const systemPrompt = this.buildSystemPrompt(profile);
    console.log(`[PersonalizationService] Generated system prompt for ${user_id}`);
    return systemPrompt;
  }

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
      preferences: profile.preferences,
    };
  }
}

const userPersonalizationService = new UserPersonalizationService();
export default userPersonalizationService;
