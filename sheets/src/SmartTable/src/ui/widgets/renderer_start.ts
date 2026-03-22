// Проверка загрузки скрипта
import {RunServer} from "@core/server/app/server";

console.log('[Renderer] Script loaded!');

// Импорт функций для работы с формулами
import { calculateCellFormula as calcFormula, previewFormula, validateFormula, saveActiveCell, showFormulaSuggestions, hideFormulaSuggestions, handleFormulaSuggestionsKeydown, insertFormula } from './formulabar/formulas-renderer.js';
import { registerFormula, removeFormula, getDependentCells, extractCellReferences } from '../core/formulas/formula-dependencies.js';
import FocusManager from '../core/focus/FocusManager.js';
import KeyboardController from '../core/keyboard-controller.js';
import TemplateManager from '../core/template-manager/TemplateManager.js';
import { TemplateManagerComponent } from '../core/template-manager/TemplateManagerComponent.js';
// Импорт системы команд для Undo/Redo
import { SetValueCommand, SetFormatCommand, MergeCellsCommand, InsertRowCommand, DeleteRowCommand, InsertColumnCommand, DeleteColumnCommand, getCurrentData } from '../core/commands.js';
import { commandManager } from '../core/command-manager.js';
import { storageService } from '../core/storage-service.js';

// === КОНФИГУРАЦИЯ ===