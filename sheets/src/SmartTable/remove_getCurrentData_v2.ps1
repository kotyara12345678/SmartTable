# Удалить локальную функцию getCurrentData - версия 2

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

# Находим и удаляем функцию
$pattern = "function getCurrentData\(\): Map<string, \{ value: string; formula\?: string; style\?: any \}> \{\s*return state\.sheetsData\.get\(state\.currentSheet\) \|\| new Map\(\);\s*\}"
$replacement = ""

# Используем regex для удаления
$content = $content -replace $pattern, ""

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "getCurrentData removed successfully!"
