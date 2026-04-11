# scripts/git-repo-analysis.ps1
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $workspaceRoot
Set-Location $workspaceRoot

Write-Host "Fetching latest changes..." -ForegroundColor Cyan
git fetch --all --prune

# Get branch states
$mainBranch = "main" # Assuming main, can fallback to origin/main if needed
$report = @{}

Write-Host "Analyzing branches..." -ForegroundColor Cyan
$localBranches = git branch --format="%(refname:short)"

$branchReports = @()

foreach ($branch in ($localBranches -split "[`r`n]+" | Where-Object { $_ -ne "" })) {
    if ($branch -eq $mainBranch) { continue }
    
    $branchInfo = @{
        Branch = $branch
    }

    $aheadBehind = git rev-list --left-right --count "$mainBranch...$branch" 
    $counts = $aheadBehind -split "`t"
    $branchInfo.BehindMain = [int]$counts[0]
    $branchInfo.AheadMain = [int]$counts[1]

    if ($branchInfo.AheadMain -gt 0) {
        $diffStat = git diff --shortstat "$mainBranch...$branch"
        $branchInfo.DiffStat = $diffStat.Trim()
        
        $commits = git log --oneline "$mainBranch..$branch"
        $branchInfo.Commits = $commits

        # Check for conflicts
        $conflictOutput = git merge-tree $(git merge-base $mainBranch $branch) $mainBranch $branch
        if ($conflictOutput -match "<<<<<<<") {
            $branchInfo.HasConflicts = $true
        } else {
            $branchInfo.HasConflicts = $false
        }
    }

    $branchReports += $branchInfo
}

$report.Branches = $branchReports

$outputPath = Join-Path $workspaceRoot "git-analysis-report.json"
$report | ConvertTo-Json -Depth 5 > $outputPath

Write-Host "Analysis saved to git-analysis-report.json" -ForegroundColor Green
