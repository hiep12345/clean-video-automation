[CmdletBinding()]
param(
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$hooksPath = (Resolve-Path (Join-Path $workspaceRoot ".githooks")).Path
$repositories = @(
    $workspaceRoot,
    (Join-Path $workspaceRoot "content-planner-kb"),
    (Join-Path $workspaceRoot "flowkit-engine")
)

foreach ($repository in $repositories) {
    if (-not (Test-Path -LiteralPath (Join-Path $repository ".git"))) {
        throw "Git repository is unavailable: $repository"
    }

    $configured = (& git -C $repository config --local --get core.hooksPath)
    if ($CheckOnly) {
        if ($configured -ne $hooksPath) {
            throw "Git hooks are not configured for: $repository"
        }
        Write-Output "Git hooks ready: $repository"
        continue
    }

    & git -C $repository config --local core.hooksPath $hooksPath
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to configure Git hooks for: $repository"
    }
    Write-Output "Git hooks configured: $repository"
}
