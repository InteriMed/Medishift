$content = Get-Content -Path "src/dashboard/pages/profile/Profile.js" -Raw
$chars = $content.ToCharArray()
$b = 0
$p = 0
$line = 1
$col = 1
for ($i=0; $i -lt $chars.Length; $i++) {
    $c = $chars[$i]
    if ($c -eq '{') { $b++ }
    elseif ($c -eq '}') { $b-- }
    elseif ($c -eq '(') { $p++ }
    elseif ($c -eq ')') { $p-- }
    
    if ($b -lt 0) {
        Write-Host "Extra closing brace at line $line, col $col"
        break
    }
    if ($p -lt 0) {
        Write-Host "Extra closing paren at line $line, col $col"
        break
    }
    
    if ($c -eq "`n") {
        $line++
        $col = 1
    } else {
        $col++
    }
}
Write-Host "Final: Braces $b, Parens $p"
