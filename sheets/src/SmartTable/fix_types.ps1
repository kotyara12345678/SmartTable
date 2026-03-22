# Исправить ошибки типов value

$filePath = "c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master\sheets\src\SmartTable\src\ui\widgets\renderer.ts"

$content = Get-Content $filePath -Raw -Encoding UTF8

# Исправляем cell.textContent = cellData.value; -> cell.textContent = cellData.value || '';
$content = $content -replace 'cell\.textContent = cellData\.value;', 'cell.textContent = cellData.value || "";'

# Исправляем finalValue = sourceData.value; -> finalValue = sourceData.value || '';
$content = $content -replace 'finalValue = sourceData\.value;', 'finalValue = sourceData.value || "";'

# Исправляем parseFloat(cellData.value) -> parseFloat(cellData.value || '0')
$content = $content -replace 'parseFloat\(cellData\.value\)', 'parseFloat(cellData.value || "0")'

# Исправляем rows.get(row)!.set(col, cellData.value); -> rows.get(row)!.set(col, cellData.value || '');
$content = $content -replace 'rows\.get\(row\)!\.set\(col, cellData\.value\);', 'rows.get(row)!.set(col, cellData.value || "");'

# Исправляем rowsMap.get(row)!.set(cellCol, cellData.value); -> rowsMap.get(row)!.set(cellCol, cellData.value || '');
$content = $content -replace 'rowsMap\.get\(row\)!\.set\(cellCol, cellData\.value\);', 'rowsMap.get(row)!.set(cellCol, cellData.value || "");'

# Исправляем cellData.value.includes(value) -> (cellData.value || '').includes(value)
$content = $content -replace 'cellData\.value\.includes\(value\)', '(cellData.value || "").includes(value)'

$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "Type errors fixed!"
