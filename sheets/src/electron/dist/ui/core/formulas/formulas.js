/**
 * Формулы для SmartTable
 */
// Словарь всех формул
export const FORMULAS = {
    // Математические
    SUM: { name: 'SUM', description: 'Сумма значений', syntax: '=SUM(A1:A10)' },
    AVERAGE: { name: 'AVERAGE', description: 'Среднее значение', syntax: '=AVERAGE(A1:A10)' },
    MIN: { name: 'MIN', description: 'Минимальное значение', syntax: '=MIN(A1:A10)' },
    MAX: { name: 'MAX', description: 'Максимальное значение', syntax: '=MAX(A1:A10)' },
    COUNT: { name: 'COUNT', description: 'Количество чисел', syntax: '=COUNT(A1:A10)' },
    COUNTA: { name: 'COUNTA', description: 'Количество непустых', syntax: '=COUNTA(A1:A10)' },
    PRODUCT: { name: 'PRODUCT', description: 'Произведение', syntax: '=PRODUCT(A1:A10)' },
    ROUND: { name: 'ROUND', description: 'Округление', syntax: '=ROUND(A1, 2)' },
    ABS: { name: 'ABS', description: 'Модуль числа', syntax: '=ABS(A1)' },
    POWER: { name: 'POWER', description: 'Возведение в степень', syntax: '=POWER(A1, 2)' },
    SQRT: { name: 'SQRT', description: 'Квадратный корень', syntax: '=SQRT(A1)' },
    // Логические
    IF: { name: 'IF', description: 'Условие', syntax: '=IF(A1>10, "Да", "Нет")' },
    AND: { name: 'AND', description: 'И', syntax: '=AND(A1>0, A1<10)' },
    OR: { name: 'OR', description: 'ИЛИ', syntax: '=OR(A1>0, A1<10)' },
    NOT: { name: 'NOT', description: 'НЕ', syntax: '=NOT(A1>10)' },
    IFERROR: { name: 'IFERROR', description: 'Если ошибка', syntax: '=IFERROR(A1/B1, 0)' },
    // Текстовые
    CONCATENATE: { name: 'CONCATENATE', description: 'Сцепить текст', syntax: '=CONCATENATE(A1, " ", B1)' },
    CONCAT: { name: 'CONCAT', description: 'Сцепить текст', syntax: '=CONCAT(A1, B1)' },
    LEN: { name: 'LEN', description: 'Длина текста', syntax: '=LEN(A1)' },
    UPPER: { name: 'UPPER', description: 'В верхний регистр', syntax: '=UPPER(A1)' },
    LOWER: { name: 'LOWER', description: 'В нижний регистр', syntax: '=LOWER(A1)' },
    PROPER: { name: 'PROPER', description: 'Заглавные буквы', syntax: '=PROPER(A1)' },
    TRIM: { name: 'TRIM', description: 'Удалить пробелы', syntax: '=TRIM(A1)' },
    LEFT: { name: 'LEFT', description: 'Слева символы', syntax: '=LEFT(A1, 3)' },
    RIGHT: { name: 'RIGHT', description: 'Справа символы', syntax: '=RIGHT(A1, 3)' },
    MID: { name: 'MID', description: 'Из середины', syntax: '=MID(A1, 2, 3)' },
    SUBSTITUTE: { name: 'SUBSTITUTE', description: 'Заменить текст', syntax: '=SUBSTITUTE(A1, "старый", "новый")' },
    // Дата и время
    TODAY: { name: 'TODAY', description: 'Сегодняшняя дата', syntax: '=TODAY()' },
    NOW: { name: 'NOW', description: 'Текущая дата и время', syntax: '=NOW()' },
    DAY: { name: 'DAY', description: 'День месяца', syntax: '=DAY(A1)' },
    MONTH: { name: 'MONTH', description: 'Месяц', syntax: '=MONTH(A1)' },
    YEAR: { name: 'YEAR', description: 'Год', syntax: '=YEAR(A1)' },
    HOUR: { name: 'HOUR', description: 'Часы', syntax: '=HOUR(A1)' },
    MINUTE: { name: 'MINUTE', description: 'Минуты', syntax: '=MINUTE(A1)' },
    SECOND: { name: 'SECOND', description: 'Секунды', syntax: '=SECOND(A1)' },
    // Поиск и ссылки
    VLOOKUP: { name: 'VLOOKUP', description: 'Вертикальный поиск', syntax: '=VLOOKUP(A1, B1:C10, 2, FALSE)' },
    HLOOKUP: { name: 'HLOOKUP', description: 'Горизонтальный поиск', syntax: '=HLOOKUP(A1, B1:C10, 2, FALSE)' },
    INDEX: { name: 'INDEX', description: 'Значение по индексу', syntax: '=INDEX(A1:C10, 2, 3)' },
    MATCH: { name: 'MATCH', description: 'Позиция значения', syntax: '=MATCH(A1, B1:B10, 0)' },
    // Финансовые
    PMT: { name: 'PMT', description: 'Платеж по кредиту', syntax: '=PMT(0.05/12, 60, 10000)' },
    FV: { name: 'FV', description: 'Будущая стоимость', syntax: '=FV(0.05/12, 60, -100)' },
    PV: { name: 'PV', description: 'Текущая стоимость', syntax: '=PV(0.05/12, 60, -100)' },
    // ИИ формула
    AI: { name: 'AI', description: 'ИИ запрос', syntax: '=AI("Сумма столбцов A и B")' },
};
// Список всех формул для автокомплита
export const FORMULA_LIST = Object.keys(FORMULAS).sort();
/**
 * Вычислить формулу
 */
export function evaluateFormula(formula, getData) {
    try {
        if (!formula.startsWith('=')) {
            return { value: formula };
        }
        const expression = formula.substring(1).toUpperCase();
        // Парсинг функции
        const match = expression.match(/^([A-Z]+)\((.*)\)$/);
        if (!match) {
            return { value: '#NAME?' };
        }
        const [, funcName, argsStr] = match;
        const args = parseArgs(argsStr, getData);
        switch (funcName) {
            case 'SUM':
                return { value: sum(args) };
            case 'AVERAGE':
                return { value: average(args) };
            case 'MIN':
                return { value: Math.min(...args.filter(isNumber)) };
            case 'MAX':
                return { value: Math.max(...args.filter(isNumber)) };
            case 'COUNT':
                return { value: args.filter(isNumber).length };
            case 'COUNTA':
                return { value: args.filter(a => a !== '').length };
            case 'PRODUCT':
                return { value: args.filter(isNumber).reduce((a, b) => a * b, 1) };
            case 'ROUND':
                return { value: Math.round(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]) };
            case 'ABS':
                return { value: Math.abs(args[0]) };
            case 'POWER':
                return { value: Math.pow(args[0], args[1]) };
            case 'SQRT':
                return { value: Math.sqrt(args[0]) };
            case 'IF':
                return { value: args[0] ? args[1] : args[2] };
            case 'AND':
                return { value: args.every(a => a) };
            case 'OR':
                return { value: args.some(a => a) };
            case 'NOT':
                return { value: !args[0] };
            case 'LEN':
                return { value: String(args[0]).length };
            case 'UPPER':
                return { value: String(args[0]).toUpperCase() };
            case 'LOWER':
                return { value: String(args[0]).toLowerCase() };
            case 'CONCAT':
            case 'CONCATENATE':
                return { value: args.join('') };
            case 'TRIM':
                return { value: String(args[0]).trim() };
            case 'LEFT':
                return { value: String(args[0]).substring(0, args[1]) };
            case 'RIGHT':
                return { value: String(args[0]).substring(String(args[0]).length - args[1]) };
            case 'TODAY':
                return { value: new Date().toLocaleDateString('ru-RU') };
            case 'NOW':
                return { value: new Date().toLocaleString('ru-RU') };
            case 'DAY':
                return { value: new Date(args[0]).getDate() };
            case 'MONTH':
                return { value: new Date(args[0]).getMonth() + 1 };
            case 'YEAR':
                return { value: new Date(args[0]).getFullYear() };
            case 'AI':
                // ИИ формула - будет реализована через IPC
                return { value: '#AI_PROCESSING...', error: 'AI request pending' };
            // Поиск и ссылки
            case 'VLOOKUP':
                // VLOOKUP(значение, таблица, номер_столбца, точное_совпадение)
                return { value: vlookup(args, getData) };
            case 'HLOOKUP':
                // HLOOKUP(значение, таблица, номер_строки, точное_совпадение)
                return { value: hlookup(args, getData) };
            case 'INDEX':
                // INDEX(диапазон, номер_строки, номер_столбца)
                return { value: index(args) };
            case 'MATCH':
                // MATCH(значение, диапазон, тип_совпадения)
                return { value: matchFunc(args, getData) };
            default:
                return { value: '#NAME?', error: `Unknown function: ${funcName}` };
        }
    }
    catch (error) {
        return { value: '#ERROR!', error: error.message };
    }
}
/**
 * Парсинг аргументов формулы
 */
function parseArgs(argsStr, getData) {
    const args = [];
    const parts = argsStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        // Диапазон ячеек (A1:A10)
        const rangeMatch = trimmed.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (rangeMatch) {
            const [, startCol, startRow, endCol, endRow] = rangeMatch;
            const values = getRangeValues(startCol, parseInt(startRow), endCol, parseInt(endRow), getData);
            args.push(...values);
            continue;
        }
        // Одиночная ячейка (A1)
        const cellMatch = trimmed.match(/^([A-Z]+)(\d+)$/);
        if (cellMatch) {
            const value = getData(trimmed);
            args.push(parseValue(value));
            continue;
        }
        // Число
        if (isNumber(trimmed)) {
            args.push(parseFloat(trimmed));
            continue;
        }
        // Текст (в кавычках)
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            args.push(trimmed.slice(1, -1));
            continue;
        }
        // Логическое значение
        if (trimmed === 'TRUE' || trimmed === 'FALSE') {
            args.push(trimmed === 'TRUE');
            continue;
        }
        args.push(trimmed);
    }
    return args;
}
/**
 * Получить значения диапазона ячеек
 */
function getRangeValues(startCol, startRow, endCol, endRow, getData) {
    const values = [];
    const startColCode = startCol.charCodeAt(0);
    const endColCode = endCol.charCodeAt(0);
    for (let col = startColCode; col <= endColCode; col++) {
        for (let row = startRow; row <= endRow; row++) {
            const cellRef = String.fromCharCode(col) + row;
            const value = getData(cellRef);
            values.push(parseValue(value));
        }
    }
    return values;
}
/**
 * Парсить значение ячейки
 */
function parseValue(value) {
    if (value === '')
        return '';
    if (value === 'TRUE')
        return true;
    if (value === 'FALSE')
        return false;
    if (isNumber(value))
        return parseFloat(value);
    return value;
}
/**
 * Проверка на число
 */
function isNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}
/**
 * Сумма значений
 */
function sum(args) {
    return args.filter(isNumber).reduce((a, b) => a + b, 0);
}
/**
 * Среднее значение
 */
function average(args) {
    const numbers = args.filter(isNumber);
    if (numbers.length === 0)
        return 0;
    return sum(numbers) / numbers.length;
}
/**
 * VLOOKUP - вертикальный поиск
 * vlookup(значение, таблица, номер_столбца, точное_совпадение)
 */
function vlookup(args, getData) {
    const [lookupValue, tableArray, colIndex, rangeLookup] = args;
    // Парсим диапазон таблицы (например, "A1:C10")
    if (typeof tableArray !== 'string' || !tableArray.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = tableArray.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const endColCode = endCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    const endRowNum = parseInt(endRow) - 1;
    // Ищем значение в первом столбце диапазона
    for (let row = startRowNum; row <= endRowNum; row++) {
        const cellRef = String.fromCharCode(65 + startColCode) + (row + 1);
        const cellValue = getData(cellRef);
        if (rangeLookup === false || rangeLookup === 0) {
            // Точное совпадение
            if (cellValue === String(lookupValue)) {
                const resultColCode = startColCode + colIndex - 1;
                const resultRef = String.fromCharCode(65 + resultColCode) + (row + 1);
                return getData(resultRef) || 0;
            }
        }
        else {
            // Приблизительное совпадение (первое значение <= lookupValue)
            if (parseFloat(cellValue) <= lookupValue) {
                const resultColCode = startColCode + colIndex - 1;
                const resultRef = String.fromCharCode(65 + resultColCode) + (row + 1);
                return getData(resultRef) || 0;
            }
        }
    }
    return '#N/A';
}
/**
 * HLOOKUP - горизонтальный поиск
 */
function hlookup(args, getData) {
    const [lookupValue, tableArray, rowIndex, rangeLookup] = args;
    if (typeof tableArray !== 'string' || !tableArray.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = tableArray.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const endColCode = endCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    // Ищем значение в первой строке диапазона
    for (let col = startColCode; col <= endColCode; col++) {
        const cellRef = String.fromCharCode(65 + col) + (startRowNum + 1);
        const cellValue = getData(cellRef);
        if (rangeLookup === false || rangeLookup === 0) {
            if (cellValue === String(lookupValue)) {
                const resultRowNum = startRowNum + rowIndex - 1;
                const resultRef = String.fromCharCode(65 + col) + (resultRowNum + 1);
                return getData(resultRef) || 0;
            }
        }
    }
    return '#N/A';
}
/**
 * INDEX - значение по индексу
 * INDEX(диапазон, номер_строки, номер_столбца)
 */
function index(args) {
    const [array, rowNum, colNum] = args;
    if (typeof array !== 'string' || !array.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = array.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    const resultColCode = startColCode + colNum - 1;
    const resultRowNum = startRowNum + rowNum - 1;
    const resultRef = String.fromCharCode(65 + resultColCode) + (resultRowNum + 1);
    return resultRef; // Возвращаем ссылку, значение получит evaluateFormula
}
/**
 * MATCH - позиция значения в диапазоне
 * MATCH(значение, диапазон, тип_совпадения)
 */
function matchFunc(args, getData) {
    const [lookupValue, array, matchType] = args;
    if (typeof array !== 'string' || !array.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = array.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const startCol = rangeMatch[1];
    const startRow = rangeMatch[2];
    const endCol = rangeMatch[3];
    const endRow = rangeMatch[4];
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const endColCode = endCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    const endRowNum = parseInt(endRow) - 1;
    // Определяем направление поиска (строка или столбец)
    const isVertical = startColCode === endColCode;
    if (isVertical) {
        // Поиск в столбце
        for (let row = startRowNum; row <= endRowNum; row++) {
            const cellRef = String.fromCharCode(65 + startColCode) + (row + 1);
            const cellValue = getData(cellRef);
            if (matchType === 0) {
                // Точное совпадение
                if (cellValue === String(lookupValue)) {
                    return row - startRowNum + 1;
                }
            }
        }
    }
    else {
        // Поиск в строке
        for (let col = startColCode; col <= endColCode; col++) {
            const cellRef = String.fromCharCode(65 + col) + (startRowNum + 1);
            const cellValue = getData(cellRef);
            if (matchType === 0) {
                if (cellValue === String(lookupValue)) {
                    return col - startColCode + 1;
                }
            }
        }
    }
    return '#N/A';
}
//# sourceMappingURL=formulas.js.map