/**
 * Time Tracker - отслеживание времени работы в приложении
 */

export interface TimeSession {
  id?: number;
  date: string; // YYYY-MM-DD
  start_time: string; // ISO string
  end_time?: string; // ISO string
  duration_seconds: number;
  session_type: 'spreadsheet' | 'dashboard' | 'ai_chat' | 'other';
  is_active: boolean;
}

export interface DailyStats {
  date: string;
  total_seconds: number;
  spreadsheet_seconds: number;
  dashboard_seconds: number;
  ai_chat_seconds: number;
  other_seconds: number;
  session_count: number;
}

export interface WeeklyStats {
  week_start: string;
  total_seconds: number;
  daily_stats: DailyStats[];
  average_daily_seconds: number;
  most_productive_day: string;
  session_count: number;
}

export class TimeTracker {
  private static instance: TimeTracker;
  private currentSession: TimeSession | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastActivity: Date = new Date();

  private constructor() {
    this.loadCurrentSession();
    this.startActivityTracking();
  }

  static getInstance(): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker();
    }
    return TimeTracker.instance;
  }

  /**
   * Начало отслеживания активности
   */
  private startActivityTracking(): void {
    // Отслеживание активности пользователя
    document.addEventListener('mousemove', () => this.updateActivity());
    document.addEventListener('keydown', () => this.updateActivity());
    document.addEventListener('click', () => this.updateActivity());
    document.addEventListener('scroll', () => this.updateActivity());

    // Периодическое обновление времени
    this.updateInterval = setInterval(() => {
      this.updateCurrentSession();
    }, 1000); // Обновляем каждую секунду
  }

  /**
   * Обновление времени последней активности
   */
  private updateActivity(): void {
    this.lastActivity = new Date();
  }

  /**
   * Начало новой сессии
   */
  startSession(type: TimeSession['session_type']): void {
    // Завершаем предыдущую сессию если есть
    this.endCurrentSession();

    // Создаем новую сессию
    this.currentSession = {
      date: this.getTodayString(),
      start_time: new Date().toISOString(),
      duration_seconds: 0,
      session_type: type,
      is_active: true
    };

    this.saveCurrentSession();
    console.log(`[Time Tracker] Started ${type} session`);
  }

  /**
   * Завершение текущей сессии
   */
  endCurrentSession(): void {
    if (this.currentSession && this.currentSession.is_active) {
      this.currentSession.end_time = new Date().toISOString();
      this.currentSession.is_active = false;
      
      // Сохраняем в базу данных
      this.saveSessionToDatabase(this.currentSession);
      
      console.log(`[Time Tracker] Ended ${this.currentSession.session_type} session: ${this.currentSession.duration_seconds}s`);
      this.currentSession = null;
    }
  }

  /**
   * Обновление текущей сессии
   */
  private updateCurrentSession(): void {
    if (this.currentSession && this.currentSession.is_active) {
      const now = new Date();
      const startTime = new Date(this.currentSession.start_time);
      
      // Проверяем не было ли долгого бездействия (более 5 минут)
      const inactiveTime = now.getTime() - this.lastActivity.getTime();
      if (inactiveTime > 5 * 60 * 1000) {
        // Если было долгое бездействие, завершаем сессию
        this.endCurrentSession();
        return;
      }

      // Обновляем длительность
      this.currentSession.duration_seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      this.saveCurrentSession();
    }
  }

  /**
   * Получение строки с сегодняшней датой
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Загрузка текущей сессии из localStorage
   */
  private loadCurrentSession(): void {
    try {
      const saved = localStorage.getItem('time_tracker_current_session');
      if (saved) {
        this.currentSession = JSON.parse(saved);
        
        // Если сессия была активна, проверяем не устарела ли она
        if (this.currentSession && this.currentSession.is_active) {
          const sessionAge = Date.now() - new Date(this.currentSession.start_time).getTime();
          // Если сессия старше 24 часов, считаем ее неактивной
          if (sessionAge > 24 * 60 * 60 * 1000) {
            this.currentSession.is_active = false;
            this.saveCurrentSession();
          }
        }
      }
    } catch (error) {
      console.error('[Time Tracker] Failed to load current session:', error);
    }
  }

  /**
   * Сохранение текущей сессии в localStorage
   */
  private saveCurrentSession(): void {
    if (this.currentSession) {
      localStorage.setItem('time_tracker_current_session', JSON.stringify(this.currentSession));
    }
  }

  /**
   * Сохранение сессии в базу данных
   */
  private async saveSessionToDatabase(session: TimeSession): Promise<void> {
    try {
      // Получаем существующие сессии
      const sessions = this.getAllSessions();
      sessions.push(session);
      
      // Ограничиваем количество сессий (храняем последние 1000)
      if (sessions.length > 1000) {
        sessions.splice(0, sessions.length - 1000);
      }
      
      localStorage.setItem('time_tracker_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('[Time Tracker] Failed to save session to database:', error);
    }
  }

  /**
   * Получение всех сессий
   */
  getAllSessions(): TimeSession[] {
    try {
      const saved = localStorage.getItem('time_tracker_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('[Time Tracker] Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Получение статистики за день
   */
  getDailyStats(date: string): DailyStats {
    const sessions = this.getAllSessions();
    const daySessions = sessions.filter(s => s.date === date);

    const stats: DailyStats = {
      date,
      total_seconds: 0,
      spreadsheet_seconds: 0,
      dashboard_seconds: 0,
      ai_chat_seconds: 0,
      other_seconds: 0,
      session_count: daySessions.length
    };

    daySessions.forEach(session => {
      stats.total_seconds += session.duration_seconds;
      stats[`${session.session_type}_seconds`] += session.duration_seconds;
    });

    return stats;
  }

  /**
   * Получение статистики за неделю
   */
  getWeeklyStats(): WeeklyStats {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartString = weekStart.toISOString().split('T')[0];

    const dailyStats: DailyStats[] = [];
    let totalSeconds = 0;
    let sessionCount = 0;
    let mostProductiveDay = '';
    let maxSeconds = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayStats = this.getDailyStats(dateString);
      dailyStats.push(dayStats);
      
      totalSeconds += dayStats.total_seconds;
      sessionCount += dayStats.session_count;
      
      if (dayStats.total_seconds > maxSeconds) {
        maxSeconds = dayStats.total_seconds;
        mostProductiveDay = dateString;
      }
    }

    return {
      week_start: weekStartString,
      total_seconds: totalSeconds,
      daily_stats: dailyStats,
      average_daily_seconds: Math.round(totalSeconds / 7),
      most_productive_day: mostProductiveDay,
      session_count: sessionCount
    };
  }

  /**
   * Получение статистики за месяц
   */
  getMonthlyStats(year: number, month: number): DailyStats[] {
    const sessions = this.getAllSessions();
    const monthString = `${year}-${month.toString().padStart(2, '0')}`;
    
    const monthSessions = sessions.filter(s => s.date.startsWith(monthString));
    const dailyStats: DailyStats[] = [];
    
    // Группируем по дням
    const groupedByDay: { [date: string]: TimeSession[] } = {};
    monthSessions.forEach(session => {
      if (!groupedByDay[session.date]) {
        groupedByDay[session.date] = [];
      }
      groupedByDay[session.date].push(session);
    });
    
    // Создаем статистику для каждого дня
    Object.keys(groupedByDay).sort().forEach(date => {
      const daySessions = groupedByDay[date];
      const stats: DailyStats = {
        date,
        total_seconds: 0,
        spreadsheet_seconds: 0,
        dashboard_seconds: 0,
        ai_chat_seconds: 0,
        other_seconds: 0,
        session_count: daySessions.length
      };
      
      daySessions.forEach(session => {
        stats.total_seconds += session.duration_seconds;
        stats[`${session.session_type}_seconds`] += session.duration_seconds;
      });
      
      dailyStats.push(stats);
    });
    
    return dailyStats;
  }

  /**
   * Получение общей статистики
   */
  getTotalStats(): {
    total_sessions: number;
    total_hours: number;
    average_session_duration: number;
    most_used_type: string;
    days_active: number;
  } {
    const sessions = this.getAllSessions();
    
    if (sessions.length === 0) {
      return {
        total_sessions: 0,
        total_hours: 0,
        average_session_duration: 0,
        most_used_type: 'none',
        days_active: 0
      };
    }

    const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    const averageDuration = totalSeconds / sessions.length;
    
    // Подсчет по типам сессий
    const typeCounts: { [type: string]: number } = {};
    sessions.forEach(session => {
      typeCounts[session.session_type] = (typeCounts[session.session_type] || 0) + session.duration_seconds;
    });
    
    const mostUsedType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, 'none'
    );
    
    const uniqueDays = new Set(sessions.map(s => s.date)).size;

    return {
      total_sessions: sessions.length,
      total_hours: Math.round(totalSeconds / 3600 * 100) / 100,
      average_session_duration: Math.round(averageDuration),
      most_used_type: mostUsedType,
      days_active: uniqueDays
    };
  }

  /**
   * Форматирование времени в читаемый вид
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  }

  /**
   * Очистка старых данных (старше 6 месяцев)
   */
  cleanupOldData(): void {
    try {
      const sessions = this.getAllSessions();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoffDate = sixMonthsAgo.toISOString().split('T')[0];

      const filteredSessions = sessions.filter(s => s.date >= cutoffDate);
      
      localStorage.setItem('time_tracker_sessions', JSON.stringify(filteredSessions));
      console.log(`[Time Tracker] Cleaned up old sessions, kept ${filteredSessions.length} sessions`);
    } catch (error) {
      console.error('[Time Tracker] Failed to cleanup old data:', error);
    }
  }

  /**
   * Остановка трекера
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.endCurrentSession();
  }
}

// Экспорт singleton экземпляра
export const timeTracker = TimeTracker.getInstance();
