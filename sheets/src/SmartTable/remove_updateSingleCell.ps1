# Удалить вызов updateSingleCell после команды

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

# Находим и удаляем строку
$content = $content -replace '\n\s+updateSingleCell\(row, col\);', ''

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "updateSingleCell call removed!"
