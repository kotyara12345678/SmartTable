/**
 * AI Agent Module for SmartTable
 * Handles communication with OpenRouter API
 */
interface AIResponse {
    success: boolean;
    content?: string;
    tableCommands?: TableCommand[];
    error?: string;
}
interface TableCommand {
    action: string;
    params: Record<string, any>;
    description: string;
}
export declare function chatWithAI(message: string, tableContext?: string): Promise<AIResponse>;
export declare function executeCommand(command: TableCommand, callbacks: {
    setCell: (col: string, row: number, value: string) => void;
    fillTable: (data: string[][]) => void;
    colorColumn: (col: string, bg?: string, text?: string) => void;
    colorCells: (cells: any[]) => void;
    boldColumn: (col: string) => void;
    sortColumn: (col: string, order: string) => void;
    clearCell: (col: string, row: number) => void;
    clearColumn: (col: string) => void;
    clearAll: () => void;
}): string;
export declare function getTableContext(data: Map<string, {
    value: string;
    style?: any;
}>, rows: number, cols: number): string;
export {};
//# sourceMappingURL=ai-agent.d.ts.map