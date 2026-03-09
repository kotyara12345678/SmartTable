/**
 * Базовый класс для событий
 * Используется для decoupled коммуникации между модулями
 */
export class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  on(event, callback) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (this._events.has(event)) {
      this._events.get(event).delete(callback);
    }
    return this;
  }

  emit(event, data) {
    if (this._events.has(event)) {
      this._events.get(event).forEach(cb => cb(data));
    }
    return this;
  }

  clear() {
    this._events.clear();
  }
}
