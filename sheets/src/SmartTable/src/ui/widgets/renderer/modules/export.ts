/**
 * Export Module - Экспорт данных
 */

export interface ExportContext {
  state: any;
  CONFIG: any;
  getCurrentData: () => Map<string, any>;
  getCellValueForSort: (cellData: any) => number | string;
}

/**
 * Экспортировать данные в формате
 */
export function exportData(
  format: 'csv' | 'xlsx' | 'json' | 'html' | 'xml' | 'ods' | 'tsv' | 'markdown',
  context: ExportContext
): void {
  const data = context.getCurrentData();
  const { ROWS, COLS } = context.CONFIG;

  switch (format) {
    case 'csv':
      exportToCSV(data, COLS, ROWS);
      break;
    case 'json':
      exportToJSON(data);
      break;
    case 'html':
      exportToHTML(data, COLS, ROWS);
      break;
    case 'xml':
      exportToXML(data, COLS, ROWS);
      break;
    case 'tsv':
      exportToTSV(data, COLS, ROWS);
      break;
    case 'markdown':
      exportToMarkdown(data, COLS, ROWS);
      break;
    default:
      console.warn('[Export] Unknown format:', format);
  }
}

/**
 * Экспорт в CSV
 */
function exportToCSV(data: Map<string, any>, cols: number, rows: number): void {
  let csv = '';
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const cellData = data.get(key);
      row.push(cellData?.value || '');
    }
    csv += row.join(',') + '\n';
  }

  downloadFile(csv, 'table.csv', 'text/csv');
}

/**
 * Экспорт в TSV
 */
function exportToTSV(data: Map<string, any>, cols: number, rows: number): void {
  let tsv = '';
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const cellData = data.get(key);
      row.push(cellData?.value || '');
    }
    tsv += row.join('\t') + '\n';
  }

  downloadFile(tsv, 'table.tsv', 'text/tab-separated-values');
}

/**
 * Экспорт в JSON
 */
function exportToJSON(data: Map<string, any>): void {
  const jsonData: any = {};
  data.forEach((value, key) => {
    jsonData[key] = value;
  });

  const json = JSON.stringify(jsonData, null, 2);
  downloadFile(json, 'table.json', 'application/json');
}

/**
 * Экспорт в HTML
 */
function exportToHTML(data: Map<string, any>, cols: number, rows: number): void {
  let html = '<table border="1">\n';
  for (let r = 0; r < rows; r++) {
    html += '  <tr>\n';
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const cellData = data.get(key);
      const value = cellData?.value || '';
      const style = cellData?.style ? ` style="${cellStyleToInline(cellData.style)}"` : '';
      html += `    <td${style}>${escapeHtml(value)}</td>\n`;
    }
    html += '  </tr>\n';
  }
  html += '</table>';

  downloadFile(html, 'table.html', 'text/html');
}

/**
 * Экспорт в XML
 */
function exportToXML(data: Map<string, any>, cols: number, rows: number): void {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<table>\n';
  for (let r = 0; r < rows; r++) {
    xml += `  <row id="${r}">\n`;
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const cellData = data.get(key);
      const value = cellData?.value || '';
      xml += `    <cell col="${c}">${escapeXml(value)}</cell>\n`;
    }
    xml += '  </row>\n';
  }
  xml += '</table>';

  downloadFile(xml, 'table.xml', 'application/xml');
}

/**
 * Экспорт в Markdown
 */
function exportToMarkdown(data: Map<string, any>, cols: number, rows: number): void {
  let md = '';
  
  // Заголовок
  const header: string[] = [];
  const separator: string[] = [];
  for (let c = 0; c < cols; c++) {
    header.push(String.fromCharCode(65 + c));
    separator.push('---');
  }
  md += '| ' + header.join(' | ') + ' |\n';
  md += '| ' + separator.join(' | ') + ' |\n';

  // Данные
  for (let r = 0; r < Math.min(rows, 100); r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const cellData = data.get(key);
      const value = (cellData?.value || '').replace(/\|/g, '\\|');
      row.push(value);
    }
    md += '| ' + row.join(' | ') + ' |\n';
  }

  downloadFile(md, 'table.md', 'text/markdown');
}

/**
 * Конвертировать стиль ячейки в inline CSS
 */
function cellStyleToInline(style: any): string {
  const css: string[] = [];
  if (style.backgroundColor) css.push(`background-color: ${style.backgroundColor}`);
  if (style.color) css.push(`color: ${style.color}`);
  if (style.textAlign) css.push(`text-align: ${style.textAlign}`);
  if (style.fontWeight) css.push(`font-weight: ${style.fontWeight}`);
  if (style.fontStyle) css.push(`font-style: ${style.fontStyle}`);
  return css.join('; ');
}

/**
 * Экранировать HTML
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Экранировать XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Скачать файл
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
