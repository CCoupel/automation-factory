# Ansible Builder - Script principal d'orchestration
# Usage: .\ansible-builder.ps1 <command> [options]

param(
    [Parameter(Position=0, Mandatory=$true)]
    [ValidateSet("publish", "deploy", "full", "clean", "status", "debug", "test", "help")]
    [string]$Command,
    
    [string]$Version,
    [string]$Namespace = "ansible-builder", 
    [switch]$DryRun,
    [switch]$SkipPublish
)

# Configuration
$SCRIPT_DIR = $PSScriptRoot

function Show-Help {
    Write-Host @"
🚀 Ansible Builder - Script d'orchestration

COMMANDES DISPONIBLES:
  publish <version>     Publier les images Docker et package Helm
  deploy               Déployer sur Kubernetes  
  full <version>       Publication + Déploiement complet
  clean                Nettoyer le déploiement existant
  status               Afficher le statut du déploiement
  debug                Diagnostic approfondi des problèmes
  test                 Tester les endpoints API
  help                 Afficher cette aide

EXEMPLES:
  .\ansible-builder.ps1 publish 1.3.0
  .\ansible-builder.ps1 deploy -Namespace ansible-builder-dev
  .\ansible-builder.ps1 full 1.3.0 -DryRun
  .\ansible-builder.ps1 clean
  .\ansible-builder.ps1 status
  .\ansible-builder.ps1 debug
  .\ansible-builder.ps1 test

OPTIONS:
  -Version <version>    Version à publier/déployer
  -Namespace <name>     Namespace Kubernetes (défaut: ansible-builder)
  -DryRun              Mode simulation
  -SkipPublish         Déployer sans publier (pour 'full')

DOCUMENTATION COMPLÈTE:
  Voir TOOLING/README.md
"@ -ForegroundColor Green
}

function Invoke-Command {
    param($ScriptName, $Arguments = @())
    
    $scriptPath = Join-Path $SCRIPT_DIR $ScriptName
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ Script non trouvé: $scriptPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔧 Exécution: $ScriptName $($Arguments -join ' ')" -ForegroundColor Cyan
    & $scriptPath @Arguments
}

# Routing des commandes
switch ($Command.ToLower()) {
    "publish" {
        if (-not $Version) {
            Write-Host "❌ Version requise pour publish" -ForegroundColor Red
            Write-Host "Usage: .\ansible-builder.ps1 publish <version>" -ForegroundColor Yellow
            exit 1
        }
        Invoke-Command "publish.ps1" @("-Version", $Version)
    }
    
    "deploy" {
        $args = @()
        if ($Namespace -ne "ansible-builder") { $args += @("-Namespace", $Namespace) }
        if ($DryRun) { $args += "-DryRun" }
        
        Invoke-Command "deploy.ps1" $args
    }
    
    "full" {
        if (-not $Version) {
            Write-Host "❌ Version requise pour full" -ForegroundColor Red
            Write-Host "Usage: .\ansible-builder.ps1 full <version>" -ForegroundColor Yellow
            exit 1
        }
        
        $args = @("-Version", $Version, "-Deploy")
        if ($Namespace -ne "ansible-builder") { $args += @("-Namespace", $Namespace) }
        if ($DryRun) { $args += "-DryRun" }
        if ($SkipPublish) { $args += "-SkipPublish" }
        
        Invoke-Command "publish-and-deploy.ps1" $args
    }
    
    "clean" {
        Write-Host "⚠️  Nettoyage du déploiement - Êtes-vous sûr ? [y/N]" -ForegroundColor Yellow -NoNewline
        $confirmation = Read-Host
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            Invoke-Command "clean.ps1"
        } else {
            Write-Host "❌ Opération annulée" -ForegroundColor Red
        }
    }
    
    "status" {
        Invoke-Command "status.ps1"
    }
    
    "debug" {
        Invoke-Command "debug.ps1"
    }
    
    "test" {
        Invoke-Command "test-api.ps1"
    }
    
    "help" {
        Show-Help
    }
    
    default {
        Write-Host "❌ Commande inconnue: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}

Write-Host "`n✅ Commande '$Command' terminée." -ForegroundColor Green