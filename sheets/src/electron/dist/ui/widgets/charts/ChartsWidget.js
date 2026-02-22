/**
 * Charts Widget - виджет для создания и отображения диаграмм
 */
export class ChartsWidget {
    constructor(container) {
        this.element = null;
        this.chartConfig = null;
        this.canvas = null;
        this.ctx = null;
        this.container = container;
    }
    async init() {
        this.container.innerHTML = `
      <div class="chart-panel" id="chartPanel" style="display: none;">
        <div class="chart-header">
          <h3 class="chart-title">Диаграмма</h3>
          <div class="chart-actions">
            <button class="chart-btn" id="btnChangeType" title="Изменить тип">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16v16H4z"/>
                <path d="M4 12h16M12 4v16"/>
              </svg>
            </button>
            <button class="chart-btn" id="btnExportChart" title="Экспорт">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </button>
            <button class="chart-btn" id="btnCloseChart" title="Закрыть">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="chart-content">
          <canvas id="chartCanvas"></canvas>
        </div>
        
        <div class="chart-footer">
          <span class="chart-info" id="chartInfo"></span>
        </div>
      </div>
    `;
        this.element = this.container.firstElementChild;
        this.canvas = this.container.querySelector('#chartCanvas');
        this.bindEvents();
    }
    bindEvents() {
        this.container.querySelector('#btnCloseChart')?.addEventListener('click', () => this.close());
        this.container.querySelector('#btnExportChart')?.addEventListener('click', () => this.exportChart());
        this.container.querySelector('#btnChangeType')?.addEventListener('click', () => this.changeChartType());
    }
    createChartFromRange(data, type = 'bar', title = 'Диаграмма') {
        this.chartConfig = { type, title, data, width: 600, height: 400 };
        this.render();
        this.show();
    }
    render() {
        if (!this.chartConfig || !this.canvas)
            return;
        const { type, data, title, width, height } = this.chartConfig;
        this.canvas.width = width || 600;
        this.canvas.height = height || 400;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx)
            return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);
        const chartArea = { left: 60, right: width - 20, top: 50, bottom: height - 40 };
        switch (type) {
            case 'bar':
            case 'horizontalBar':
                this.drawBarChart(data, chartArea);
                break;
            case 'line':
            case 'radar':
            case 'scatter':
                this.drawLineChart(data, chartArea);
                break;
            case 'pie':
            case 'doughnut':
            case 'polarArea':
                this.drawPieChart(data, chartArea);
                break;
            case 'area':
            case 'bubble':
                this.drawAreaChart(data, chartArea);
                break;
        }
        this.updateChartInfo();
    }
    drawBarChart(data, area) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const width = area.right - area.left;
        const height = area.bottom - area.top;
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        const minValue = Math.min(...data.datasets.flatMap(d => d.data));
        const range = maxValue - minValue || 1;
        const totalBars = data.labels.length;
        const datasetsCount = data.datasets.length;
        const barWidth = (width / totalBars) * 0.7 / datasetsCount;
        const gap = (width / totalBars) * 0.15;
        const defaultColors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'];
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.left, area.top);
        ctx.lineTo(area.left, area.bottom);
        ctx.lineTo(area.right, area.bottom);
        ctx.stroke();
        ctx.strokeStyle = '#eeeeee';
        for (let i = 0; i <= 5; i++) {
            const y = area.top + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(area.left, y);
            ctx.lineTo(area.right, y);
            ctx.stroke();
            const value = maxValue - (range / 5) * i;
            ctx.fillStyle = '#666666';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(1), area.left - 5, y + 4);
        }
        data.datasets.forEach((dataset, datasetIndex) => {
            const color = dataset.color || defaultColors[datasetIndex % defaultColors.length];
            dataset.data.forEach((value, index) => {
                const barHeight = ((value - minValue) / range) * height;
                const x = area.left + (width / totalBars) * index + gap + (barWidth + gap) * datasetIndex;
                const y = area.bottom - barHeight;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, barWidth, barHeight);
                ctx.fillStyle = '#666666';
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                const savedAngle = ctx.canvas.style.transform ? parseFloat(ctx.canvas.style.transform.replace('rotate(', '')) : 0;
                ctx.rotate(-0.3);
                ctx.fillText(data.labels[index], x + barWidth / 2, area.bottom + 15);
                ctx.rotate(0.3);
            });
        });
        this.drawLegend(data, area.right - 120, area.top);
    }
    drawLineChart(data, area) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const width = area.right - area.left;
        const height = area.bottom - area.top;
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        const minValue = Math.min(...data.datasets.flatMap(d => d.data));
        const range = maxValue - minValue || 1;
        const totalPoints = data.labels.length;
        const pointSpacing = width / (totalPoints - 1 || 1);
        const defaultColors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'];
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.left, area.top);
        ctx.lineTo(area.left, area.bottom);
        ctx.lineTo(area.right, area.bottom);
        ctx.stroke();
        ctx.strokeStyle = '#eeeeee';
        for (let i = 0; i <= 5; i++) {
            const y = area.top + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(area.left, y);
            ctx.lineTo(area.right, y);
            ctx.stroke();
        }
        data.datasets.forEach((dataset, datasetIndex) => {
            const color = dataset.color || defaultColors[datasetIndex % defaultColors.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            dataset.data.forEach((value, index) => {
                const x = area.left + pointSpacing * index;
                const y = area.bottom - ((value - minValue) / range) * height;
                if (index === 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.stroke();
        });
        ctx.fillStyle = '#666666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        data.labels.forEach((label, index) => {
            const x = area.left + pointSpacing * index;
            ctx.fillText(label, x, area.bottom + 15);
        });
        this.drawLegend(data, area.right - 120, area.top);
    }
    drawPieChart(data, area) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const centerX = (area.left + area.right) / 2;
        const centerY = (area.top + area.bottom) / 2 + 20;
        const radius = Math.min(area.right - area.left, area.bottom - area.top) / 2 - 20;
        const defaultColors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#00BCD4'];
        const total = data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 1;
        let startAngle = -Math.PI / 2;
        data.datasets[0]?.data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            const color = data.datasets[0].color || defaultColors[index % defaultColors.length];
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(((value / total) * 100).toFixed(1) + '%', labelX, labelY);
            startAngle += sliceAngle;
        });
        const legendX = area.right - 120;
        const legendY = area.top;
        data.labels.forEach((label, index) => {
            const color = defaultColors[index % defaultColors.length];
            ctx.fillStyle = color;
            ctx.fillRect(legendX, legendY + index * 20, 12, 12);
            ctx.fillStyle = '#333333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(label, legendX + 18, legendY + index * 20 + 10);
        });
    }
    drawAreaChart(data, area) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const width = area.right - area.left;
        const height = area.bottom - area.top;
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        const minValue = Math.min(...data.datasets.flatMap(d => d.data));
        const range = maxValue - minValue || 1;
        const totalPoints = data.labels.length;
        const pointSpacing = width / (totalPoints - 1 || 1);
        const defaultColors = ['rgba(76, 175, 80, 0.6)', 'rgba(33, 150, 243, 0.6)', 'rgba(255, 193, 7, 0.6)'];
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.left, area.top);
        ctx.lineTo(area.left, area.bottom);
        ctx.lineTo(area.right, area.bottom);
        ctx.stroke();
        ctx.strokeStyle = '#eeeeee';
        for (let i = 0; i <= 5; i++) {
            const y = area.top + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(area.left, y);
            ctx.lineTo(area.right, y);
            ctx.stroke();
        }
        data.datasets.forEach((dataset, datasetIndex) => {
            const color = dataset.color || defaultColors[datasetIndex % defaultColors.length];
            ctx.fillStyle = color;
            ctx.strokeStyle = color.replace('0.6', '1');
            ctx.lineWidth = 2;
            ctx.beginPath();
            dataset.data.forEach((value, index) => {
                const x = area.left + pointSpacing * index;
                const y = area.bottom - ((value - minValue) / range) * height;
                if (index === 0) {
                    ctx.moveTo(x, area.bottom);
                    ctx.lineTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            });
            const lastX = area.left + pointSpacing * (totalPoints - 1);
            ctx.lineTo(lastX, area.bottom);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
        ctx.fillStyle = '#666666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        data.labels.forEach((label, index) => {
            const x = area.left + pointSpacing * index;
            ctx.fillText(label, x, area.bottom + 15);
        });
        this.drawLegend(data, area.right - 120, area.top);
    }
    drawLegend(data, x, y) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const defaultColors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0'];
        data.datasets.forEach((dataset, index) => {
            const color = dataset.color || defaultColors[index % defaultColors.length];
            ctx.fillStyle = color;
            ctx.fillRect(x, y + index * 20, 12, 12);
            ctx.fillStyle = '#333333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.label, x + 18, y + index * 20 + 10);
        });
    }
    updateChartInfo() {
        const infoEl = this.container.querySelector('#chartInfo');
        if (infoEl && this.chartConfig) {
            const typeNames = {
                bar: 'Столбчатая',
                horizontalBar: 'Горизонтальная',
                line: 'Линейная',
                pie: 'Круговая',
                doughnut: 'Пончик',
                area: 'Площадей',
                radar: 'Радар',
                scatter: 'Точечная',
                bubble: 'Пузырьковая',
                polarArea: 'Полярная'
            };
            infoEl.textContent = `${typeNames[this.chartConfig.type]} | ${this.chartConfig.data.labels.length} точек`;
        }
    }
    show() {
        const panel = this.container.querySelector('#chartPanel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
    close() {
        const panel = this.container.querySelector('#chartPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
    exportChart() {
        if (!this.canvas)
            return;
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
    changeChartType() {
        if (!this.chartConfig)
            return;
        const types = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'area', 'radar', 'scatter', 'bubble', 'polarArea'];
        const currentIndex = types.indexOf(this.chartConfig.type);
        const nextIndex = (currentIndex + 1) % types.length;
        this.chartConfig.type = types[nextIndex];
        this.render();
    }
    destroy() {
        if (this.element) {
            this.element.innerHTML = '';
            this.element.remove();
        }
        this.element = null;
        this.canvas = null;
        this.ctx = null;
    }
}
//# sourceMappingURL=ChartsWidget.js.map