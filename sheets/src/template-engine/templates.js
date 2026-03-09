/**
 * Пример шаблона: Bank Transactions
 * Демонстрация всех возможностей Template Engine
 */

export const bankTransactionsTemplate = {
  name: "Bank Transactions",
  version: "1.0",
  description: "Шаблон для учёта банковских транзакций с автоматической категоризацией",
  
  columns: [
    {
      id: "date",
      type: "date",
      label: "Дата",
      defaultValue: null
    },
    {
      id: "description",
      type: "text",
      label: "Описание",
      defaultValue: ""
    },
    {
      id: "amount",
      type: "number",
      label: "Сумма (EUR)",
      defaultValue: 0
    },
    {
      id: "category",
      type: "select",
      label: "Категория",
      options: ["Purchases", "Food", "Transport", "Utilities", "Entertainment", "Income", "Other"],
      defaultValue: "Other"
    },
    {
      id: "vat",
      type: "formula",
      label: "НДС (19%)",
      formula: "amount * 0.19 / 1.19",
      readOnly: true
    },
    {
      id: "net",
      type: "formula",
      label: "Нетто",
      formula: "amount - vat",
      readOnly: true
    }
  ],

  rules: [
    {
      id: "auto-amazon",
      trigger: "onCellChange",
      condition: {
        column: "description",
        operator: "contains",
        value: "amazon"
      },
      actions: [
        { type: "setValue", column: "category", value: "Purchases" }
      ],
      priority: 10
    },
    {
      id: "auto-lidl",
      trigger: "onCellChange",
      condition: {
        column: "description",
        operator: "contains",
        value: "lidl"
      },
      actions: [
        { type: "setValue", column: "category", value: "Food" }
      ],
      priority: 10
    },
    {
      id: "auto-bolt",
      trigger: "onCellChange",
      condition: {
        column: "description",
        operator: "contains",
        value: "bolt"
      },
      actions: [
        { type: "setValue", column: "category", value: "Transport" }
      ],
      priority: 10
    },
    {
      id: "auto-salary",
      trigger: "onCellChange",
      condition: {
        column: "description",
        operator: "contains",
        value: "salary"
      },
      actions: [
        { type: "setValue", column: "category", value: "Income" }
      ],
      priority: 10
    },
    {
      id: "large-amount-warning",
      trigger: "onCellChange",
      condition: {
        column: "amount",
        operator: "greaterThan",
        value: 1000
      },
      actions: [
        { type: "setValue", column: "category", value: "Other" }
      ],
      priority: 5
    }
  ]
};

/**
 * Пример шаблона: Project Tasks
 * Шаблон для управления задачами проекта
 */
export const projectTasksTemplate = {
  name: "Project Tasks",
  version: "1.0",
  description: "Управление задачами с автоматическим расчётом прогресса",
  
  columns: [
    {
      id: "taskName",
      type: "text",
      label: "Задача",
      defaultValue: ""
    },
    {
      id: "assignee",
      type: "text",
      label: "Исполнитель",
      defaultValue: ""
    },
    {
      id: "status",
      type: "select",
      label: "Статус",
      options: ["Not Started", "In Progress", "Review", "Done"],
      defaultValue: "Not Started"
    },
    {
      id: "hoursEstimated",
      type: "number",
      label: "Часы (план)",
      defaultValue: 0
    },
    {
      id: "hoursActual",
      type: "number",
      label: "Часы (факт)",
      defaultValue: 0
    },
    {
      id: "hourlyRate",
      type: "number",
      label: "Ставка (EUR/час)",
      defaultValue: 50
    },
    {
      id: "costEstimated",
      type: "formula",
      label: "Стоимость (план)",
      formula: "hoursEstimated * hourlyRate",
      readOnly: true
    },
    {
      id: "costActual",
      type: "formula",
      label: "Стоимость (факт)",
      formula: "hoursActual * hourlyRate",
      readOnly: true
    },
    {
      id: "variance",
      type: "formula",
      label: "Отклонение",
      formula: "costActual - costEstimated",
      readOnly: true
    },
    {
      id: "variancePercent",
      type: "formula",
      label: "% отклонения",
      formula: "costEstimated > 0 ? (variance / costEstimated) * 100 : 0",
      readOnly: true
    }
  ],

  rules: [
    {
      id: "auto-done-status",
      trigger: "onCellChange",
      condition: {
        column: "hoursActual",
        operator: "greaterThan",
        value: 0
      },
      actions: [
        { type: "setValue", column: "status", value: "In Progress" }
      ],
      priority: 5
    },
    {
      id: "high-variance-alert",
      trigger: "onCellChange",
      condition: {
        column: "variancePercent",
        operator: "greaterThan",
        value: 20
      },
      actions: [
        { type: "setValue", column: "status", value: "Review" }
      ],
      priority: 1
    }
  ]
};

/**
 * Пример шаблона: Inventory
 * Шаблон для учёта товаров на складе
 */
export const inventoryTemplate = {
  name: "Inventory Management",
  version: "1.0",
  description: "Учёт товаров с автоматическим расчётом стоимости и маржи",
  
  columns: [
    {
      id: "sku",
      type: "text",
      label: "Артикул",
      defaultValue: ""
    },
    {
      id: "productName",
      type: "text",
      label: "Наименование",
      defaultValue: ""
    },
    {
      id: "quantity",
      type: "number",
      label: "Количество",
      defaultValue: 0
    },
    {
      id: "costPrice",
      type: "number",
      label: "Закупочная цена",
      defaultValue: 0
    },
    {
      id: "sellingPrice",
      type: "number",
      label: "Цена продажи",
      defaultValue: 0
    },
    {
      id: "totalCost",
      type: "formula",
      label: "Общая стоимость",
      formula: "quantity * costPrice",
      readOnly: true
    },
    {
      id: "totalValue",
      type: "formula",
      label: "Общая ценность",
      formula: "quantity * sellingPrice",
      readOnly: true
    },
    {
      id: "margin",
      type: "formula",
      label: "Маржа",
      formula: "sellingPrice - costPrice",
      readOnly: true
    },
    {
      id: "marginPercent",
      type: "formula",
      label: "% маржи",
      formula: "costPrice > 0 ? (margin / costPrice) * 100 : 0",
      readOnly: true
    },
    {
      id: "reorderNeeded",
      type: "select",
      label: "Заказ нужен",
      options: ["Yes", "No"],
      defaultValue: "No"
    }
  ],

  rules: [
    {
      id: "low-stock-alert",
      trigger: "onCellChange",
      condition: {
        column: "quantity",
        operator: "lessThan",
        value: 10
      },
      actions: [
        { type: "setValue", column: "reorderNeeded", value: "Yes" }
      ],
      priority: 10
    },
    {
      id: "sufficient-stock",
      trigger: "onCellChange",
      condition: {
        column: "quantity",
        operator: "greaterOrEqual",
        value: 10
      },
      actions: [
        { type: "setValue", column: "reorderNeeded", value: "No" }
      ],
      priority: 10
    }
  ]
};
