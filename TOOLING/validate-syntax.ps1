# Simple syntax validation
$scriptPath = ".\dev-deploy.ps1"

try {
    $errors = @()
    $tokens = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
    
    if ($errors.Count -eq 0) {
        Write-Host "✅ PowerShell syntax is valid" -ForegroundColor Green
        Write-Host "📊 Script contains $($tokens.Count) tokens" -ForegroundColor Cyan
        Write-Host "🔧 Ready to use!" -ForegroundColor Green
    } else {
        Write-Host "❌ PowerShell syntax errors found:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "   Line $($error.Extent.StartLineNumber): $($error.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Error validating script: $_" -ForegroundColor Red
}