# Патч renderer.ts - добавляет autoLoad в init()

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

$oldText = "console.log('[Renderer] init() called');"
$newText = @"
console.log('[Renderer] init() called');

  // === ЗАГРУЗКА СОХРАНЕННЫХ ДАННЫХ ===
  const dataLoaded = autoLoad();
  if ($dataLoaded) {
    console.log('[Renderer] Restored data from previous session');
  }
"@

$content = $content.Replace($oldText, $newText)

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "Patch applied successfully!"
