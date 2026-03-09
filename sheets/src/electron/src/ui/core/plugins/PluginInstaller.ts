/**
 * PluginInstaller - загрузка и установка плагинов из GitHub Releases
 * Автоматическая установка плагинов в один клик
 */

import { createLogger } from '../logger.js';

const log = createLogger('PluginInstaller');

/**
 * Стадии установки плагина
 */
export type InstallStage = 'downloading' | 'extracting' | 'installing' | 'complete';

/**
 * Прогресс установки
 */
export interface InstallProgress {
  stage: InstallStage;
  progress: number; // 0-100
  message: string;
}

/**
 * Результат установки
 */
export interface InstallResult {
  success: boolean;
  pluginId?: string;
  path?: string;
  error?: string;
}

/**
 * Информация о релизе GitHub
 */
interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    content_type: string;
    size: number;
  }>;
}

/**
 * Установщик плагинов
 */
export class PluginInstaller {
  private pluginsDir: string = '';

  constructor() {
    // Путь устанавливается через IPC при установке
  }

  /**
   * Установить плагин из GitHub Releases
   * @param releaseUrl - URL релиза (например: https://github.com/owner/repo/releases/latest)
   *                   или прямая ссылка на ZIP (например: https://github.com/.../releases/download/.../plugin.zip)
   * @param onProgress - Callback для обновления прогресса
   */
  async installFromRelease(
    releaseUrl: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<InstallResult> {
    try {
      log.info('Installing plugin from release:', releaseUrl);

      // Проверяем, является ли ссылка прямой на ZIP файл
      if (this.isDirectZipUrl(releaseUrl)) {
        log.info('Direct ZIP URL detected, skipping GitHub API call');
        
        onProgress?.({
          stage: 'downloading',
          progress: 10,
          message: 'Загрузка плагина...'
        });

        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) {
          throw new Error('Electron API недоступен. Убедитесь, что приложение запущено в Electron.');
        }

        // Извлекаем pluginId из URL
        const pluginId = this.extractPluginIdFromZipUrl(releaseUrl);

        // Main процесс скачает через net модуль (обходит CORS)
        const result: InstallResult = await electronAPI.ipcRenderer.invoke(
          'download-and-install-plugin',
          {
            downloadUrl: releaseUrl,
            pluginId: pluginId,
            releaseUrl: releaseUrl
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Ошибка установки плагина');
        }

        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: `Плагин "${result.pluginId}" успешно установлен!`
        });

        log.info('Plugin installed successfully:', result.pluginId, 'at', result.path);
        return result;
      }

      // 1. Парсим URL для получения owner/repo
      const { owner, repo } = this.parseGitHubUrl(releaseUrl);
      if (!owner || !repo) {
        throw new Error('Неверный GitHub URL. Ожидаемый формат: https://github.com/owner/repo/releases/...');
      }

      log.info(`GitHub repo: ${owner}/${repo}`);

      // 2. Получаем последний релиз через GitHub API
      onProgress?.({
        stage: 'downloading',
        progress: 10,
        message: 'Получение информации о релизе...'
      });

      const releaseData = await this.fetchLatestRelease(owner, repo);
      log.info('Latest release:', releaseData.tag_name);

      // 3. Находим ZIP файл в ассетах
      const zipAsset = releaseData.assets.find(
        (asset) => asset.name.endsWith('.zip')
      );

      if (!zipAsset) {
        throw new Error(
          'ZIP файл не найден в релизе. ' +
          'Убедитесь, что релиз содержит .zip архив с плагином.'
        );
      }

      log.info('Found ZIP asset:', zipAsset.name);

      // 4. Через IPC отправляем на скачивание и распаковку в main процесс
      onProgress?.({
        stage: 'downloading',
        progress: 30,
        message: `Загрузка ${zipAsset.name}...`
      });

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        throw new Error('Electron API недоступен. Убедитесь, что приложение запущено в Electron.');
      }

      log.info('Sending download request to main process...');

      // Main процесс скачает через net модуль (обходит CORS)
      const result: InstallResult = await electronAPI.ipcRenderer.invoke(
        'download-and-install-plugin',
        {
          downloadUrl: zipAsset.browser_download_url,
          pluginId: this.extractPluginIdFromRelease(releaseData),
          releaseUrl: releaseUrl
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Ошибка установки плагина');
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Плагин "${result.pluginId}" успешно установлен!`
      });

      log.info('Plugin installed successfully:', result.pluginId, 'at', result.path);
      return result;

    } catch (error: any) {
      log.error('Installation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Парсинг GitHub URL для извлечения owner и repo
   */
  private parseGitHubUrl(url: string): { owner?: string; repo?: string } {
    try {
      // Поддерживаем форматы:
      // https://github.com/owner/repo/releases/latest
      // https://github.com/owner/repo/releases/tag/v1.0.0
      // https://github.com/owner/repo
      const urlObj = new URL(url);
      
      if (urlObj.hostname !== 'github.com') {
        return {};
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        return {
          owner: pathParts[0],
          repo: pathParts[1]
        };
      }
      
      return {};
    } catch {
      // Если URL не валиден, пробуем regex
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
      return {};
    }
  }

  /**
   * Получение данных о последнем релизе через GitHub API
   */
  private async fetchLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    
    log.info('Fetching release from:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SmartTable-Plugin-Installer'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          'Репозиторий не найден или релизы не опубликованы. ' +
          'Убедитесь, что репозиторий публичный и содержит релизы.'
        );
      }
      if (response.status === 403) {
        throw new Error(
          'GitHub API rate limit превышен. Попробуйте позже.'
        );
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Скачивание файла по URL
   */
  private async downloadFile(url: string): Promise<Blob> {
    log.info('Downloading from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  }

  /**
   * Извлечение ID плагина из релиза
   * Пытается найти manifest.json или использует название репозитория
   */
  private extractPluginIdFromRelease(releaseData: GitHubRelease): string {
    // Приоритеты:
    // 1. tag_name (например: v1.0.0 -> используем как временный ID)
    // 2. repo name из URL
    // 3. fallback

    if (releaseData.tag_name) {
      return releaseData.tag_name.replace(/^v/, ''); // убираем 'v' префикс
    }

    if (releaseData.name) {
      return releaseData.name.toLowerCase().replace(/\s+/g, '-');
    }

    return 'unknown-plugin-' + Date.now();
  }

  /**
   * Проверка: является ли URL прямой ссылкой на ZIP файл
   */
  private isDirectZipUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'github.com' && 
             urlObj.pathname.includes('/releases/download/') && 
             urlObj.pathname.endsWith('.zip');
    } catch {
      return false;
    }
  }

  /**
   * Извлечение pluginId из прямой ссылки на ZIP
   * Например: https://github.com/user/repo/releases/download/plugin/notes-plugin.zip -> notes-plugin
   */
  private extractPluginIdFromZipUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Ищем часть после /releases/download/
      const downloadIndex = pathParts.indexOf('releases');
      if (downloadIndex >= 0 && downloadIndex + 2 < pathParts.length) {
        // pathParts[downloadIndex] = 'releases'
        // pathParts[downloadIndex + 1] = 'download'
        // pathParts[downloadIndex + 2] = тег версии (например, 'plugin')
        // pathParts[downloadIndex + 3] = имя файла (например, 'notes-plugin.zip')
        const fileName = pathParts[downloadIndex + 3];
        if (fileName && fileName.endsWith('.zip')) {
          return fileName.replace('.zip', '');
        }
      }
      
      // Fallback: используем имя файла из URL
      const fileName = pathParts[pathParts.length - 1];
      return fileName.replace('.zip', '');
    } catch {
      return 'unknown-plugin-' + Date.now();
    }
  }

  /**
   * Проверка: является ли URL валидным GitHub Releases URL или прямой ссылкой на ZIP
   */
  isValidGitHubReleaseUrl(url: string): boolean {
    // Проверяем как обычный URL релиза, так и прямую ссылку на ZIP
    if (this.isDirectZipUrl(url)) {
      return true;
    }
    const { owner, repo } = this.parseGitHubUrl(url);
    return !!(owner && repo);
  }

  /**
   * Получить прямой URL на ZIP файл из релиза
   */
  async getZipDownloadUrl(releaseUrl: string): Promise<string | null> {
    try {
      const { owner, repo } = this.parseGitHubUrl(releaseUrl);
      if (!owner || !repo) return null;

      const releaseData = await this.fetchLatestRelease(owner, repo);
      
      const zipAsset = releaseData.assets.find(
        (asset) => asset.name.endsWith('.zip')
      );
      
      return zipAsset?.browser_download_url || null;
    } catch {
      return null;
    }
  }
}

// Экспорт единственного экземпляра
export const pluginInstaller = new PluginInstaller();
