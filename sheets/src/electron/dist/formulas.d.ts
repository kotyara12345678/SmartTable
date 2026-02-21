/**
 * Формулы для SmartTable
 */
export interface FormulaResult {
    value: string | number | boolean;
    error?: string;
}
export declare const FORMULAS: {
    SUM: {
        name: string;
        description: string;
        syntax: string;
    };
    AVERAGE: {
        name: string;
        description: string;
        syntax: string;
    };
    MIN: {
        name: string;
        description: string;
        syntax: string;
    };
    MAX: {
        name: string;
        description: string;
        syntax: string;
    };
    COUNT: {
        name: string;
        description: string;
        syntax: string;
    };
    COUNTA: {
        name: string;
        description: string;
        syntax: string;
    };
    PRODUCT: {
        name: string;
        description: string;
        syntax: string;
    };
    ROUND: {
        name: string;
        description: string;
        syntax: string;
    };
    ABS: {
        name: string;
        description: string;
        syntax: string;
    };
    POWER: {
        name: string;
        description: string;
        syntax: string;
    };
    SQRT: {
        name: string;
        description: string;
        syntax: string;
    };
    IF: {
        name: string;
        description: string;
        syntax: string;
    };
    AND: {
        name: string;
        description: string;
        syntax: string;
    };
    OR: {
        name: string;
        description: string;
        syntax: string;
    };
    NOT: {
        name: string;
        description: string;
        syntax: string;
    };
    IFERROR: {
        name: string;
        description: string;
        syntax: string;
    };
    CONCATENATE: {
        name: string;
        description: string;
        syntax: string;
    };
    CONCAT: {
        name: string;
        description: string;
        syntax: string;
    };
    LEN: {
        name: string;
        description: string;
        syntax: string;
    };
    UPPER: {
        name: string;
        description: string;
        syntax: string;
    };
    LOWER: {
        name: string;
        description: string;
        syntax: string;
    };
    PROPER: {
        name: string;
        description: string;
        syntax: string;
    };
    TRIM: {
        name: string;
        description: string;
        syntax: string;
    };
    LEFT: {
        name: string;
        description: string;
        syntax: string;
    };
    RIGHT: {
        name: string;
        description: string;
        syntax: string;
    };
    MID: {
        name: string;
        description: string;
        syntax: string;
    };
    SUBSTITUTE: {
        name: string;
        description: string;
        syntax: string;
    };
    TODAY: {
        name: string;
        description: string;
        syntax: string;
    };
    NOW: {
        name: string;
        description: string;
        syntax: string;
    };
    DAY: {
        name: string;
        description: string;
        syntax: string;
    };
    MONTH: {
        name: string;
        description: string;
        syntax: string;
    };
    YEAR: {
        name: string;
        description: string;
        syntax: string;
    };
    HOUR: {
        name: string;
        description: string;
        syntax: string;
    };
    MINUTE: {
        name: string;
        description: string;
        syntax: string;
    };
    SECOND: {
        name: string;
        description: string;
        syntax: string;
    };
    VLOOKUP: {
        name: string;
        description: string;
        syntax: string;
    };
    HLOOKUP: {
        name: string;
        description: string;
        syntax: string;
    };
    INDEX: {
        name: string;
        description: string;
        syntax: string;
    };
    MATCH: {
        name: string;
        description: string;
        syntax: string;
    };
    PMT: {
        name: string;
        description: string;
        syntax: string;
    };
    FV: {
        name: string;
        description: string;
        syntax: string;
    };
    PV: {
        name: string;
        description: string;
        syntax: string;
    };
    AI: {
        name: string;
        description: string;
        syntax: string;
    };
};
export declare const FORMULA_LIST: string[];
/**
 * Вычислить формулу
 */
export declare function evaluateFormula(formula: string, getData: (cell: string) => string): FormulaResult;
//# sourceMappingURL=formulas.d.ts.map