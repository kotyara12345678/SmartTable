# Удалить строки 528-530 с функцией getCurrentData

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$lines = Get-Content $filePath -Encoding UTF8

# Удаляем строки 528-530 (0-индексированные: 527-529)
$newLines = $lines[0..527] + $lines[530..($lines.Count-1)]

$newLines | Set-Content $filePath -Encoding UTF8

Write-Host "Lines 528-530 removed successfully!"
