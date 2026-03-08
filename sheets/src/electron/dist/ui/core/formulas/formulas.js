/**
 * Формулы для SmartTable - Полная поддержка IF/ELSE и логических операторов
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
    MOD: { name: 'MOD', description: 'Остаток от деления', syntax: '=MOD(10, 3)' },
    // Логические
    IF: { name: 'IF', description: 'Условие', syntax: '=IF(A1>10, "Да", "Нет")' },
    IFS: { name: 'IFS', description: 'Несколько условий', syntax: '=IFS(A1>10, "Больше", A1<5, "Меньше", TRUE, "Норма")' },
    AND: { name: 'AND', description: 'И', syntax: '=AND(A1>0, A1<10)' },
    OR: { name: 'OR', description: 'ИЛИ', syntax: '=OR(A1>0, A1<10)' },
    NOT: { name: 'NOT', description: 'НЕ', syntax: '=NOT(A1>10)' },
    IFERROR: { name: 'IFERROR', description: 'Если ошибка', syntax: '=IFERROR(A1/B1, 0)' },
    TRUE: { name: 'TRUE', description: 'ИСТИНА', syntax: '=TRUE()' },
    FALSE: { name: 'FALSE', description: 'ЛОЖЬ', syntax: '=FALSE()' },
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
    TEXT: { name: 'TEXT', description: 'Форматирование числа', syntax: '=TEXT(A1, "0.00")' },
    FIND: { name: 'FIND', description: 'Найти текст (с учетом регистра)', syntax: '=FIND("найти", A1)' },
    SEARCH: { name: 'SEARCH', description: 'Найти текст (без учета регистра)', syntax: '=SEARCH("найти", A1)' },
    // Дата и время
    TODAY: { name: 'TODAY', description: 'Сегодняшняя дата', syntax: '=TODAY()' },
    NOW: { name: 'NOW', description: 'Текущая дата и время', syntax: '=NOW()' },
    DAY: { name: 'DAY', description: 'День месяца', syntax: '=DAY(A1)' },
    MONTH: { name: 'MONTH', description: 'Месяц', syntax: '=MONTH(A1)' },
    YEAR: { name: 'YEAR', description: 'Год', syntax: '=YEAR(A1)' },
    HOUR: { name: 'HOUR', description: 'Часы', syntax: '=HOUR(A1)' },
    MINUTE: { name: 'MINUTE', description: 'Минуты', syntax: '=MINUTE(A1)' },
    SECOND: { name: 'SECOND', description: 'Секунды', syntax: '=SECOND(A1)' },
    DATE: { name: 'DATE', description: 'Дата из компонентов', syntax: '=DATE(2024, 1, 15)' },
    TIME: { name: 'TIME', description: 'Время из компонентов', syntax: '=TIME(12, 30, 0)' },
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
        const expression = formula.substring(1);
        // 1. Простая ссылка на ячейку (=A1, =B2)
        const cellRefMatch = expression.match(/^([A-Z]+)(\d+)$/i);
        if (cellRefMatch) {
            const value = getData(expression.toUpperCase());
            return { value: value !== '' ? parseValue(value) : 0 };
        }
        // 2. Арифметическое выражение (=A1+B2, =A1*2, =A1>B1)
        if (!expression.match(/^[A-Z]+\(/i)) {
            return evaluateArithmeticExpression(expression, getData);
        }
        // 3. Формула с функцией (=SUM(A1:A10))
        const funcMatch = expression.match(/^([A-Z]+)\((.*)\)$/i);
        if (!funcMatch) {
            return { value: '#NAME?', error: 'Invalid formula syntax' };
        }
        const [, funcName, argsStr] = funcMatch;
        const upperFuncName = funcName.toUpperCase();
        // Для IF и IFS используем специальный парсинг с поддержкой логических выражений
        let args;
        if (upperFuncName === 'IF') {
            args = parseIfArgs(argsStr, getData);
        }
        else if (upperFuncName === 'IFS') {
            return evaluateIfs(argsStr, getData);
        }
        else if (upperFuncName === 'AND' || upperFuncName === 'OR') {
            args = parseLogicalArgs(argsStr, getData);
        }
        else {
            args = parseArgs(argsStr, getData);
        }
        switch (upperFuncName) {
            case 'SUM':
                return { value: sum(args) };
            case 'AVERAGE':
                return { value: average(args) };
            case 'MIN':
                return { value: args.filter(isNumber).length > 0 ? Math.min(...args.filter(isNumber)) : 0 };
            case 'MAX':
                return { value: args.filter(isNumber).length > 0 ? Math.max(...args.filter(isNumber)) : 0 };
            case 'COUNT':
                return { value: args.filter(isNumber).length };
            case 'COUNTA':
                return { value: args.filter(a => a !== '' && a !== null).length };
            case 'PRODUCT':
                return { value: args.filter(isNumber).reduce((a, b) => a * b, 1) };
            case 'ROUND':
                return { value: Math.round(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]) };
            case 'ROUNDUP':
                return { value: Math.ceil(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]) };
            case 'ROUNDDOWN':
                return { value: Math.floor(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]) };
            case 'ABS':
                return { value: Math.abs(args[0]) };
            case 'POWER':
                return { value: Math.pow(args[0], args[1]) };
            case 'SQRT':
                return { value: Math.sqrt(args[0]) };
            case 'MOD':
                return { value: args[0] % args[1] };
            case 'IF':
                // IF(condition, valueIfTrue, valueIfFalse)
                const condition = evaluateCondition(args[0]);
                return { value: condition ? args[1] : args[2] };
            case 'AND':
                return { value: args.every(a => evaluateCondition(a)) };
            case 'OR':
                return { value: args.some(a => evaluateCondition(a)) };
            case 'NOT':
                return { value: !evaluateCondition(args[0]) };
            case 'IFERROR':
                return { value: args[0] };
            case 'TRUE':
                return { value: true };
            case 'FALSE':
                return { value: false };
            case 'LEN':
                return { value: String(args[0] ?? '').length };
            case 'UPPER':
                return { value: String(args[0] ?? '').toUpperCase() };
            case 'LOWER':
                return { value: String(args[0] ?? '').toLowerCase() };
            case 'PROPER':
                return { value: String(args[0] ?? '').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) };
            case 'CONCAT':
            case 'CONCATENATE':
                return { value: args.map(a => String(a ?? '')).join('') };
            case 'TRIM':
                return { value: String(args[0] ?? '').trim() };
            case 'LEFT':
                return { value: String(args[0] ?? '').substring(0, args[1]) };
            case 'RIGHT':
                const str = String(args[0] ?? '');
                return { value: str.substring(str.length - args[1]) };
            case 'MID':
                return { value: String(args[0] ?? '').substring(args[1] - 1, args[1] - 1 + args[2]) };
            case 'SUBSTITUTE':
                return { value: String(args[0] ?? '').split(String(args[1])).join(String(args[2])) };
            case 'TEXT':
                return { value: formatNumber(args[0], args[1]) };
            case 'FIND':
                const findPos = String(args[1] ?? '').indexOf(String(args[0]));
                return { value: findPos >= 0 ? findPos + 1 : '#VALUE!' };
            case 'SEARCH':
                const searchPos = String(args[1] ?? '').toLowerCase().indexOf(String(args[0]).toLowerCase());
                return { value: searchPos >= 0 ? searchPos + 1 : '#VALUE!' };
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
            case 'HOUR':
                return { value: new Date(args[0]).getHours() };
            case 'MINUTE':
                return { value: new Date(args[0]).getMinutes() };
            case 'SECOND':
                return { value: new Date(args[0]).getSeconds() };
            case 'DATE':
                return { value: new Date(args[0], args[1] - 1, args[2]).toLocaleDateString('ru-RU') };
            case 'TIME':
                return { value: new Date(0, 0, 0, args[0], args[1], args[2]).toLocaleTimeString('ru-RU') };
            case 'AI':
                return { value: '#AI_PROCESSING...', error: 'AI request pending' };
            // Поиск и ссылки
            case 'VLOOKUP':
                return { value: vlookup(args, getData) };
            case 'HLOOKUP':
                return { value: hlookup(args, getData) };
            case 'INDEX':
                return { value: index(args, getData) };
            case 'MATCH':
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
 * Вычисление логического условия
 */
function evaluateCondition(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    if (typeof value === 'string') {
        if (value.toUpperCase() === 'TRUE')
            return true;
        if (value.toUpperCase() === 'FALSE')
            return false;
        if (value === '')
            return false;
        const num = parseFloat(value);
        if (!isNaN(num))
            return num !== 0;
        return true;
    }
    return !!value;
}
/**
 * Парсинг аргументов для IF с поддержкой логических выражений
 */
function parseIfArgs(argsStr, getData) {
    const args = [];
    let current = '';
    let parenDepth = 0;
    let inQuotes = false;
    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === '"' && (i === 0 || argsStr[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
            current += char;
        }
        else if (char === '(' && !inQuotes) {
            parenDepth++;
            current += char;
        }
        else if (char === ')' && !inQuotes) {
            parenDepth--;
            current += char;
        }
        else if (char === ',' && parenDepth === 0 && !inQuotes) {
            const value = parseIfArg(current.trim(), getData);
            if (Array.isArray(value)) {
                args.push(...value);
            }
            else {
                args.push(value);
            }
            current = '';
        }
        else {
            current += char;
        }
    }
    if (current.trim()) {
        const value = parseIfArg(current.trim(), getData);
        if (Array.isArray(value)) {
            args.push(...value);
        }
        else {
            args.push(value);
        }
    }
    return args;
}
/**
 * Парсинг одного аргумента IF (может содержать логическое выражение)
 */
function parseIfArg(arg, getData) {
    // Проверяем на логическое выражение с операторами сравнения
    const operators = ['>=', '<=', '<>', '!=', '=', '>', '<'];
    for (const op of operators) {
        const opIndex = findOperator(arg, op);
        if (opIndex !== -1) {
            const left = arg.substring(0, opIndex).trim();
            const right = arg.substring(opIndex + op.length).trim();
            const leftVal = parseSingleValue(left, getData);
            const rightVal = parseSingleValue(right, getData);
            return compareValues(leftVal, rightVal, op);
        }
    }
    // Если нет оператора, парсим как обычное значение
    return parseSingleValue(arg, getData);
}
/**
 * Поиск оператора с учетом кавычек
 */
function findOperator(str, op) {
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
        }
        else if (!inQuotes && str.substring(i, i + op.length) === op) {
            return i;
        }
    }
    return -1;
}
/**
 * Парсинг логических аргументов для AND/OR
 */
function parseLogicalArgs(argsStr, getData) {
    const args = [];
    const parts = splitArgs(argsStr);
    for (const part of parts) {
        const trimmed = part.trim();
        args.push(parseIfArg(trimmed, getData));
    }
    return args;
}
/**
 * Разделение аргументов с учетом вложенных функций
 */
function splitArgs(argsStr) {
    const parts = [];
    let current = '';
    let parenDepth = 0;
    let inQuotes = false;
    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (char === '"' && (i === 0 || argsStr[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
            current += char;
        }
        else if (char === '(' && !inQuotes) {
            parenDepth++;
            current += char;
        }
        else if (char === ')' && !inQuotes) {
            parenDepth--;
            current += char;
        }
        else if (char === ',' && parenDepth === 0 && !inQuotes) {
            parts.push(current);
            current = '';
        }
        else {
            current += char;
        }
    }
    if (current) {
        parts.push(current);
    }
    return parts;
}
/**
 * Парсинг одиночного значения
 */
function parseSingleValue(value, getData) {
    // Диапазон ячеек (A1:A10)
    const rangeMatch = value.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (rangeMatch) {
        const [, startCol, startRow, endCol, endRow] = rangeMatch;
        return getRangeValues(startCol, parseInt(startRow), endCol, parseInt(endRow), getData);
    }
    // Одиночная ячейка (A1)
    const cellMatch = value.match(/^([A-Z]+)(\d+)$/i);
    if (cellMatch) {
        const cellValue = getData(value.toUpperCase());
        return parseValue(cellValue);
    }
    // Число
    if (isNumber(value)) {
        return parseFloat(value);
    }
    // Текст (в кавычках)
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    // Логическое значение
    if (value.toUpperCase() === 'TRUE')
        return true;
    if (value.toUpperCase() === 'FALSE')
        return false;
    return value;
}
/**
 * Сравнение значений
 */
function compareValues(left, right, operator) {
    // Преобразуем к одному типу для сравнения
    let l = left;
    let r = right;
    // Если оба числа - числовое сравнение
    if (isNumber(l) && isNumber(r)) {
        l = parseFloat(l);
        r = parseFloat(r);
    }
    else if (typeof l === 'string' && typeof r === 'string') {
        // Строковое сравнение
    }
    else {
        // Смешанное - приводим к строке
        l = String(l);
        r = String(r);
    }
    switch (operator) {
        case '=': return l === r;
        case '<>':
        case '!=': return l !== r;
        case '>': return l > r;
        case '<': return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        default: return false;
    }
}
/**
 * Вычисление IFS (несколько условий)
 */
function evaluateIfs(argsStr, getData) {
    const args = parseIfArgs(argsStr, getData);
    // Обрабатываем пары (условие, значение)
    for (let i = 0; i < args.length - 1; i += 2) {
        const condition = evaluateCondition(args[i]);
        if (condition) {
            return { value: args[i + 1] };
        }
    }
    // Если последнее условие TRUE, возвращаем последнее значение
    if (args.length % 2 === 1 && evaluateCondition(args[args.length - 2])) {
        return { value: args[args.length - 1] };
    }
    return { value: '#N/A', error: 'No true condition found' };
}
/**
 * Вычисление арифметического выражения
 */
function evaluateArithmeticExpression(expression, getData) {
    let calcExpression = expression;
    // Заменяем ссылки на ячейки их значениями
    const cellRefs = expression.match(/([A-Z]+)(\d+)/gi);
    if (cellRefs) {
        for (const ref of cellRefs) {
            const value = getData(ref.toUpperCase());
            const numValue = parseValue(value);
            calcExpression = calcExpression.replace(new RegExp(ref, 'gi'), String(numValue));
        }
    }
    // Заменяем операторы сравнения на JavaScript эквиваленты
    calcExpression = calcExpression
        .replace(/<>/g, '!==')
        .replace(/>=/g, '>=')
        .replace(/<=/g, '<=')
        .replace(/=/g, '===')
        .replace(/&&/g, '&&')
        .replace(/\|\|/g, '||')
        .replace(/!/g, '!');
    // Проверяем что выражение безопасное (разрешаем цифры, операторы, скобки, точки, пробелы)
    const safePattern = /^[\d+\-*/().\s!<>=|&'"A-Z]+$/i;
    if (safePattern.test(calcExpression)) {
        try {
            // Используем Function вместо eval для безопасности
            const result = new Function('return ' + calcExpression)();
            return { value: result };
        }
        catch (e) {
            return { value: '#ERROR!', error: 'Invalid expression' };
        }
    }
    return { value: '#ERROR!', error: 'Invalid expression' };
}
/**
 * Парсинг аргументов формулы
 */
function parseArgs(argsStr, getData) {
    const args = [];
    const parts = splitArgs(argsStr);
    for (const part of parts) {
        const trimmed = part.trim();
        const value = parseSingleValue(trimmed, getData);
        // Разворачиваем массивы (диапазоны)
        if (Array.isArray(value)) {
            args.push(...value);
        }
        else {
            args.push(value);
        }
    }
    return args;
}
/**
 * Получить значения диапазона ячеек
 */
function getRangeValues(startCol, startRow, endCol, endRow, getData) {
    const values = [];
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const endColCode = endCol.toUpperCase().charCodeAt(0) - 65;
    for (let col = startColCode; col <= endColCode; col++) {
        for (let row = startRow; row <= endRow; row++) {
            const cellRef = String.fromCharCode(65 + col) + row;
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
    if (typeof value === 'number')
        return !isNaN(value) && isFinite(value);
    if (typeof value === 'string') {
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num);
    }
    return false;
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
 * Форматирование числа
 */
function formatNumber(value, format) {
    if (typeof value !== 'number')
        return String(value);
    // Простая реализация популярных форматов
    if (format === '0.00')
        return value.toFixed(2);
    if (format === '0.0')
        return value.toFixed(1);
    if (format === '0')
        return Math.round(value).toString();
    if (format === '#,##0.00')
        return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === '#,##0')
        return Math.round(value).toLocaleString('ru-RU');
    return String(value);
}
/**
 * VLOOKUP - вертикальный поиск
 */
function vlookup(args, getData) {
    const [lookupValue, tableArray, colIndex, rangeLookup] = args;
    if (typeof tableArray !== 'string' || !tableArray.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = tableArray.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    const endRowNum = parseInt(endRow) - 1;
    for (let row = startRowNum; row <= endRowNum; row++) {
        const cellRef = String.fromCharCode(65 + startColCode) + (row + 1);
        const cellValue = getData(cellRef);
        const isMatch = rangeLookup === false || rangeLookup === 0 || rangeLookup === false
            ? cellValue === String(lookupValue)
            : parseFloat(cellValue) <= lookupValue;
        if (isMatch) {
            const resultColCode = startColCode + colIndex - 1;
            const resultRef = String.fromCharCode(65 + resultColCode) + (row + 1);
            return getData(resultRef) || 0;
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
    const [, startCol, startRow, endCol] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const endColCode = endCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    for (let col = startColCode; col <= endColCode; col++) {
        const cellRef = String.fromCharCode(65 + col) + (startRowNum + 1);
        const cellValue = getData(cellRef);
        if ((rangeLookup === false || rangeLookup === 0) && cellValue === String(lookupValue)) {
            const resultRowNum = startRowNum + rowIndex - 1;
            const resultRef = String.fromCharCode(65 + col) + (resultRowNum + 1);
            return getData(resultRef) || 0;
        }
    }
    return '#N/A';
}
/**
 * INDEX - значение по индексу
 */
function index(args, getData) {
    const [array, rowNum, colNum] = args;
    if (typeof array !== 'string' || !array.includes(':')) {
        return '#ERROR!';
    }
    const rangeMatch = array.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!rangeMatch)
        return '#ERROR!';
    const [, startCol, startRow] = rangeMatch;
    const startColCode = startCol.toUpperCase().charCodeAt(0) - 65;
    const startRowNum = parseInt(startRow) - 1;
    const resultColCode = startColCode + (colNum || 1) - 1;
    const resultRowNum = startRowNum + (rowNum || 1) - 1;
    const resultRef = String.fromCharCode(65 + resultColCode) + (resultRowNum + 1);
    return getData(resultRef);
}
/**
 * MATCH - позиция значения в диапазоне
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
    const isVertical = startColCode === endColCode;
    if (isVertical) {
        for (let row = startRowNum; row <= endRowNum; row++) {
            const cellRef = String.fromCharCode(65 + startColCode) + (row + 1);
            const cellValue = getData(cellRef);
            if (matchType === 0 && cellValue === String(lookupValue)) {
                return row - startRowNum + 1;
            }
        }
    }
    else {
        for (let col = startColCode; col <= endColCode; col++) {
            const cellRef = String.fromCharCode(65 + col) + (startRowNum + 1);
            const cellValue = getData(cellRef);
            if (matchType === 0 && cellValue === String(lookupValue)) {
                return col - startColCode + 1;
            }
        }
    }
    return '#N/A';
}
//# sourceMappingURL=formulas.js.map