/**
 * Database Manager - управление локальной базой данных без внешних зависимостей
 */

// Re-export из simple-database.ts для совместимости
export { 
  databaseManager, 
  SimpleDatabaseManager as DatabaseManager,
  ChatMessage,
  ChatSession,
  UserPreferences
} from './simple-database.js';
