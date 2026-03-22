# Исправление ошибки с if ()

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

$oldText = "if () {"
$newText = "if (dataLoaded) {"

$content = $content.Replace($oldText, $newText)

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "Fix applied successfully!"
