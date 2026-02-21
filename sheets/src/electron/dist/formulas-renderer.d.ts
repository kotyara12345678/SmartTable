/**
 * Интеграция формул в SmartTable Renderer
 */
export declare function setupFormulaSupport(formulaInput: HTMLInputElement, cellGrid: HTMLElement, autocompleteEl: HTMLElement, formulaListEl: HTMLElement, getData: (cellRef: string) => string, setCurrentCellFormula: (formula: string) => void): void;
/**
 * Вычислить формулу для ячейки
 */
export declare function calculateCellFormula(formula: string, currentRow: number, currentCol: number, getData: (row: number, col: number) => string): string;
//# sourceMappingURL=formulas-renderer.d.ts.map