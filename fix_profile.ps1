$path = "src/dashboard/pages/profile/Profile.js"
$content = Get-Content -Path $path -Raw
$newContent = $content -replace "}, \[activeTab, formData, profileConfig, t\];", "}, [activeTab, formData, profileConfig, t]);"
Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Host "Applied the fix successfully."
