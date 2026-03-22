# Удалить оставшееся объявление getCurrentData

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$lines = Get-Content $filePath -Encoding UTF8

# Находим и удаляем строку с "function getCurrentData"
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match "^function getCurrentData\(\):") {
    Write-Host "Removing line $i : $($lines[$i])"
    # Пропускаем эту строку
  } else {
    $newLines += $lines[$i]
  }
}

$newLines | Set-Content $filePath -Encoding UTF8

Write-Host "getCurrentData declaration removed!"
