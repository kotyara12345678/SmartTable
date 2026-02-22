/**
 * SmartTable Diagrams Library
 * Современная библиотека для создания диаграмм
 */

export type ChartType = 
  | 'bar' 
  | 'horizontalBar' 
  | 'line' 
  | 'area' 
  | 'pie' 
  | 'doughnut' 
  | 'radar'
  | 'scatter'
  | 'bubble'
  | 'polar';

export interface DataPoint {
  label: string;
  value: number;
}

export interface ChartDataset {
  label: string;
  data: DataPoint[];
  color?: string;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  datasets: ChartDataset[];
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

export interface ChartOptions {
  colors?: string[];
  fontFamily?: string;
  fontSize?: number;
}

// Цветовая палитра по умолчанию
const DEFAULT_COLORS = [
  '#3B82F6', // синий
  '#10B981', // зеленый
  '#F59E0B', // желтый
  '#EF4444', // красный
  '#8B5CF6', // фиолетовый
  '#EC4899', // розовый
  '#06B6D4', // голубой
  '#F97316', // оранжевый
  '#84CC16', // лаймовый
  '#6366F1', // индиго
];

// Анализ данных и выбор лучшего типа диаграммы
export function analyzeDataAndSuggestChartType(data: ChartDataset[]): ChartType {
  if (!data || data.length === 0) return 'bar';
  
  const dataset = data[0];
  const points = dataset.data;
  const labelCount = points.length;
  
  // Анализируем данные
  const values = points.map(p => p.value);
  const hasNegative = values.some(v => v < 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avg; // изменчивость
  
  // Для сравнения категорий (до 8 категорий) - круговая или пончик
  if (labelCount <= 5) {
    return 'pie';
  }
  
  // Для небольшого количества данных с трендом - линейная
  if (labelCount <= 12 && coefficientOfVariation < 1.5) {
    return 'line';
  }
  
  // Для сравнения значений - столбчатая (по умолчанию)
  return 'bar';
}

// Получить цвет по индексу
export function getColor(index: number, customColors?: string[]): string {
  const colors = customColors || DEFAULT_COLORS;
  return colors[index % colors.length];
}

// Форматирование числа
export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

// Основной класс диаграммы
export class DiagramRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ChartConfig;
  private options: ChartOptions;
  
  constructor(canvas: HTMLCanvasElement, config: ChartConfig, options: ChartOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.options = options;
  }
  
  // Основной метод отрисовки
  render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    
    // Рисуем в зависимости от типа
    switch (this.config.type) {
      case 'bar':
        this.renderBarChart();
        break;
      case 'horizontalBar':
        this.renderHorizontalBarChart();
        break;
      case 'line':
        this.renderLineChart();
        break;
      case 'area':
        this.renderAreaChart();
        break;
      case 'pie':
        this.renderPieChart();
        break;
      case 'doughnut':
        this.renderDoughnutChart();
        break;
      case 'radar':
        this.renderRadarChart();
        break;
      default:
        this.renderBarChart();
    }
  }
  
  // Столбчатая диаграмма
  private renderBarChart(): void {
    const { width, height } = this.canvas;
    const padding = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const barWidth = chartWidth / data.length - 10;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    // Оси и сетка
    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 1;
    
    // Сетка
    if (this.config.showGrid !== false) {
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left, y);
        this.ctx.lineTo(width - padding.right, y);
        this.ctx.stroke();
        
        // Значения
        const value = maxValue - (maxValue / 5) * i;
        this.ctx.fillStyle = '#6B7280';
        this.ctx.font = '12px ' + (this.options.fontFamily || 'Arial');
        this.ctx.textAlign = 'right';
        this.ctx.fillText(formatNumber(value), padding.left - 10, y + 4);
      }
    }
    
    // Столбцы
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / data.length) + 5;
      const barHeight = (point.value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Столбец
      const color = getColor(i, this.options.colors);
      this.ctx.fillStyle = color;
      
      // Закругленные углы
      this.roundRect(x, y, barWidth, barHeight, 4);
      this.ctx.fill();
      
      // Значение над столбцом
      this.ctx.fillStyle = '#374151';
      this.ctx.font = 'bold 12px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(formatNumber(point.value), x + barWidth / 2, y - 8);
      
      // Подпись
      this.ctx.fillStyle = '#6B7280';
      this.ctx.font = '11px ' + (this.options.fontFamily || 'Arial');
      this.ctx.fillText(point.label, x + barWidth / 2, height - padding.bottom + 20);
    });
  }
  
  // Горизонтальная столбчатая диаграмма
  private renderHorizontalBarChart(): void {
    const { width, height } = this.canvas;
    const padding = { top: 60, right: 80, bottom: 40, left: 100 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const barHeight = chartHeight / data.length - 8;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    // Сетка
    if (this.config.showGrid !== false) {
      this.ctx.strokeStyle = '#E5E7EB';
      this.ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const x = padding.left + (chartWidth / 5) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(x, padding.top);
        this.ctx.lineTo(x, height - padding.bottom);
        this.ctx.stroke();
        
        const value = (maxValue / 5) * i;
        this.ctx.fillStyle = '#6B7280';
        this.ctx.font = '11px ' + (this.options.fontFamily || 'Arial');
        this.ctx.textAlign = 'center';
        this.ctx.fillText(formatNumber(value), x, height - padding.bottom + 15);
      }
    }
    
    // Столбцы
    data.forEach((point, i) => {
      const y = padding.top + i * (chartHeight / data.length) + 4;
      const barWidth = (point.value / maxValue) * chartWidth;
      
      // Подпись
      this.ctx.fillStyle = '#374151';
      this.ctx.font = '12px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'right';
      this.ctx.fillText(point.label, padding.left - 10, y + barHeight / 2 + 4);
      
      // Столбец
      const color = getColor(i, this.options.colors);
      this.ctx.fillStyle = color;
      this.roundRect(padding.left, y, barWidth, barHeight, 4);
      this.ctx.fill();
      
      // Значение
      this.ctx.fillStyle = '#374151';
      this.ctx.font = 'bold 11px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'left';
      this.ctx.fillText(formatNumber(point.value), padding.left + barWidth + 8, y + barHeight / 2 + 4);
    });
  }
  
  // Линейная диаграмма
  private renderLineChart(): void {
    const { width, height } = this.canvas;
    const padding = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    // Сетка
    if (this.config.showGrid !== false) {
      this.ctx.strokeStyle = '#E5E7EB';
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left, y);
        this.ctx.lineTo(width - padding.right, y);
        this.ctx.stroke();
        
        const value = maxValue - (range / 5) * i;
        this.ctx.fillStyle = '#6B7280';
        this.ctx.font = '11px ' + (this.options.fontFamily || 'Arial');
        this.ctx.textAlign = 'right';
        this.ctx.fillText(formatNumber(value), padding.left - 10, y + 4);
      }
    }
    
    // Линия
    const color = getColor(0, this.options.colors);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / (data.length - 1 || 1));
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
    
    // Точки и подписи
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / (data.length - 1 || 1));
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      
      // Точка
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Белая точка внутри
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Подпись
      this.ctx.fillStyle = '#6B7280';
      this.ctx.font = '10px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(point.label, x, height - padding.bottom + 20);
    });
  }
  
  // Диаграмма с областями
  private renderAreaChart(): void {
    const { width, height } = this.canvas;
    const padding = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    const color = getColor(0, this.options.colors);
    
    // Заливка области
    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, padding.top + chartHeight);
    
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / (data.length - 1 || 1));
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      this.ctx.lineTo(x, y);
    });
    
    this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    this.ctx.closePath();
    
    // Градиент
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, color + '80');
    gradient.addColorStop(1, color + '20');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Линия
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / (data.length - 1 || 1));
      const y = padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
    
    // Подписи
    data.forEach((point, i) => {
      const x = padding.left + i * (chartWidth / (data.length - 1 || 1));
      this.ctx.fillStyle = '#6B7280';
      this.ctx.font = '10px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(point.label, x, height - padding.bottom + 20);
    });
  }
  
  // Круговая диаграмма
  private renderPieChart(): void {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(width, height) / 2 - 60;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const total = data.reduce((sum, point) => sum + point.value, 0);
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    let startAngle = -Math.PI / 2;
    
    data.forEach((point, i) => {
      const sliceAngle = (point.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      
      // Сектор
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.closePath();
      
      this.ctx.fillStyle = getColor(i, this.options.colors);
      this.ctx.fill();
      
      // Сектор белый (для пончика)
      if (this.config.type === 'doughnut') {
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius * 0.5, startAngle, endAngle);
        this.ctx.closePath();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
      }
      
      // Подписи
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * (this.config.type === 'doughnut' ? 0.75 : 0.6);
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;
      
      const percent = ((point.value / total) * 100).toFixed(1);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 12px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(percent + '%', labelX, labelY);
      
      startAngle = endAngle;
    });
    
    // Легенда
    let legendY = height - 30 - data.length * 20;
    data.forEach((point, i) => {
      const color = getColor(i, this.options.colors);
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(width - 150, legendY, 12, 12);
      
      this.ctx.fillStyle = '#374151';
      this.ctx.font = '11px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'left';
      this.ctx.fillText(point.label, width - 132, legendY + 10);
      
      legendY += 20;
    });
  }
  
  // Пончик (разновидность круговой)
  private renderDoughnutChart(): void {
    this.renderPieChart();
  }
  
  // Радарная диаграмма
  private renderRadarChart(): void {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = Math.min(width, height) / 2 - 80;
    
    const dataset = this.config.datasets[0];
    const data = dataset.data;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const angleStep = (Math.PI * 2) / data.length;
    
    // Заголовок
    this.ctx.fillStyle = '#1F2937';
    this.ctx.font = 'bold 18px ' + (this.options.fontFamily || 'Arial');
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.config.title, width / 2, 30);
    
    // Сетка
    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 1;
    
    for (let r = 1; r <= 5; r++) {
      this.ctx.beginPath();
      for (let i = 0; i <= data.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius / 5) * r;
        const y = centerY + Math.sin(angle) * (radius / 5) * r;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    
    // Оси
    for (let i = 0; i < data.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      this.ctx.stroke();
    }
    
    // Данные
    const color = getColor(0, this.options.colors);
    this.ctx.beginPath();
    
    data.forEach((point, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = (point.value / maxValue) * radius;
      const x = centerX + Math.cos(angle) * value;
      const y = centerY + Math.sin(angle) * value;
      
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    
    this.ctx.closePath();
    this.ctx.fillStyle = color + '40';
    this.ctx.fill();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Точки
    data.forEach((point, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = (point.value / maxValue) * radius;
      const x = centerX + Math.cos(angle) * value;
      const y = centerY + Math.sin(angle) * value;
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Подписи
      this.ctx.fillStyle = '#374151';
      this.ctx.font = '11px ' + (this.options.fontFamily || 'Arial');
      this.ctx.textAlign = 'center';
      const labelX = centerX + Math.cos(angle) * (radius + 20);
      const labelY = centerY + Math.sin(angle) * (radius + 20);
      this.ctx.fillText(point.label, labelX, labelY);
    });
  }
  
  // Вспомогательная функция для скругленных углов
  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}

// Упрощенная функция для быстрого создания диаграммы
export function createChart(
  canvas: HTMLCanvasElement, 
  data: { labels: string[]; values: number[] },
  type: ChartType = 'bar',
  title: string = 'Диаграмма'
): void {
  const config: ChartConfig = {
    type,
    title,
    datasets: [{
      label: 'Данные',
      data: data.labels.map((label, i) => ({ label, value: data.values[i] }))
    }]
  };
  
  const renderer = new DiagramRenderer(canvas, config);
  renderer.render();
}
