"""Test complex SmartScript"""
import sys
sys.path.insert(0, '.')

from pysheets.src.core.smartscript.interpreter import SmartScriptInterpreter

code = """# === SmartScript: Анализатор зарплат сотрудников ===

# Данные
employees = 12
budget = 1500000
min_salary = 45000
max_salary = 200000
bonus_rate = 0.15
tax_rate = 0.13

# Пользовательская функция: расчёт чистой зарплаты
func net_salary(gross):
    tax = gross * tax_rate
    net = gross - tax
    return net

# Пользовательская функция: расчёт бонуса
func calc_bonus(salary, performance):
    if performance > 90:
        bonus = salary * bonus_rate * 1.5
        return bonus
    if performance > 70:
        bonus = salary * bonus_rate
        return bonus
    bonus = salary * bonus_rate * 0.5
    return bonus

# Расчёт средней зарплаты
avg_salary = budget / employees
net_avg = net_salary(avg_salary)

# Категоризация бюджета
if budget > 2000000:
    budget_status = "Отличный бюджет"
elif budget > 1000000:
    budget_status = "Нормальный бюджет"
else:
    budget_status = "Ограниченный бюджет"

# Расчёт бонусов для разных уровней
top_bonus = calc_bonus(max_salary, 95)
mid_bonus = calc_bonus(avg_salary, 75)
low_bonus = calc_bonus(min_salary, 50)

# Итоговый фонд с бонусами
total_bonus_fund = ROUND(top_bonus + mid_bonus + low_bonus)
total_with_bonus = budget + total_bonus_fund

# Формируем отчёт
report = "=== ОТЧЁТ ПО ЗАРПЛАТАМ ==="
report = report + " | Сотрудников: " + STR(employees)
report = report + " | Бюджет: " + STR(budget) + " руб"
report = report + " | Средняя ЗП (gross): " + STR(ROUND(avg_salary)) + " руб"
report = report + " | Средняя ЗП (net): " + STR(ROUND(net_avg)) + " руб"
report = report + " | Статус: " + budget_status
report = report + " | Фонд бонусов: " + STR(total_bonus_fund) + " руб"
report = report + " | Итого с бонусами: " + STR(ROUND(total_with_bonus)) + " руб"

return report
"""

try:
    i = SmartScriptInterpreter()
    result = i.execute(code)
    print("=== RESULT ===")
    for r in result:
        print(r)
    print("\n=== VARIABLES ===")
    for k, v in sorted(i.variables.items()):
        print(f"  {k} = {v}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
