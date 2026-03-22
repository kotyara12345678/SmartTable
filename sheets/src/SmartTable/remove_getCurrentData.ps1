# Удалить локальную функцию getCurrentData

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

$oldText = @"
function getCurrentData(): Map<string, { value: string; formula?: string; style?: any }> {
  return state.sheetsData.get(state.currentSheet) || new Map();
}

// === ИНИЦИАЛИЗАЦИЯ ===
"@
$newText = @"
// === ИНИЦИАЛИЗАЦИЯ ===
"@

$content = $content.Replace($oldText, $newText)

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "getCurrentData removed successfully!"
