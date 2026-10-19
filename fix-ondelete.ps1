$filePath = "app\[locale]\project\[id]\companies\page.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace onOperation with onDelete
$content = $content -replace 'onOperation=\{\(op\) =>', 'onDelete={(cdeId) =>'
$content = $content -replace 'if \(op\.type === ''delete''\) \{', ''
$content = $content -replace 'handleSessionDelete\(op\.fileId\);', 'handleSessionDelete(cdeId);'
$content = $content -replace 'd\.cdeFileId !== op\.fileId', 'd.cdeFileId !== cdeId'
$content = $content -replace '\}\s+\}\s+\}\s+/>', '}}/>'.Replace(' ', '')

# Remove the extra closing brace
$content = $content -replace '(\s+)if \(true\) \{', '$1'
$content = $content -replace '(\s+)\}\s+\}\s+\}\s+/>', '$1}}/>'.Replace(' ', '')

Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
Write-Host "File updated successfully"
