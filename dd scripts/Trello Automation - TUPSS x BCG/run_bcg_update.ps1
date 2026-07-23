# ============================================================
# BCG Update Script - TUPSS
# 1. Updates all 5 Trello checklist items
# 2. Deploys dashboard to Netlify automatically
# ============================================================

$trelloKey   = "993f52d5251c5bcb140abd564640448e"
$trelloToken = "ATTA49c0a050f00619bd5865be62073abef51809dd0bf485783dc017e04a5593fd59FEC06CC9"
$netlifyToken = "nfp_a3NvR2EZL4TBvhXV7Rv9yU7m5pxRWaXa4575"
$siteId       = "150ea733-da70-4351-abac-51393c06506b"

# ============================================================
# UPDATE THESE NUMBERS EACH PERIOD
# ============================================================
$bcgCounts = @{
    "7"    = 336
    "3606" = 756
    "6822" = 203
    "6964" = 215
    "7177" = 372
}

# ============================================================
# Card and checklist item IDs (do not change)
# ============================================================
$cards = @(
    @{ store="7";    cardId="6a1faa79677d65ad42f436e1"; itemId="6a1faa7a677d65ad42f4371c"; pmb=405 },
    @{ store="3606"; cardId="6a1fadaa06ba961514ded7e1"; itemId="6a1fadaa06ba961514ded81c"; pmb=754 },
    @{ store="6822"; cardId="6a1e3f55d3b5367023f00612"; itemId="6a1e3f55d3b5367023f0064b"; pmb=211 },
    @{ store="6964"; cardId="6a1fa76ddc47ca7e49878d34"; itemId="6a1fa76ddc47ca7e49878d6f"; pmb=230 },
    @{ store="7177"; cardId="6a1fa5eb339ee1fcf2112488"; itemId="6a1fa5eb339ee1fcf21124c3"; pmb=408 }
)

# ============================================================
# Step 1: Update Trello
# ============================================================
Write-Host ""
Write-Host "Updating Trello..." -ForegroundColor Cyan

foreach ($c in $cards) {
    $bcg     = $bcgCounts[$c.store]
    $pct     = [math]::Round(($bcg / $c.pmb) * 100, 1)
    $missing = $c.pmb - $bcg
    $text    = "MPS/BCG ($($c.pmb) PMBs / $bcg BCG) - $pct%, Missing $missing"

    $url  = "https://trello.com/1/cards/$($c.cardId)/checkItem/$($c.itemId)?key=$trelloKey&token=$trelloToken"
    $body = '{"name":"' + $text + '"}'

    try {
        $response = Invoke-RestMethod -Uri $url -Method PUT -ContentType "application/json" -Body $body
        Write-Host "  Center $($c.store) - OK" -ForegroundColor Green
    } catch {
        Write-Host "  Center $($c.store) - ERROR: $_" -ForegroundColor Red
    }
}

Write-Host "Trello updated." -ForegroundColor Green

# ============================================================
# Step 2: Deploy to Netlify
# ============================================================
Write-Host ""
Write-Host "Deploying to Netlify..." -ForegroundColor Cyan

$htmlPath    = "$PSScriptRoot\bcg_dashboard.html"
$htmlContent = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$htmlBytes   = [System.Text.Encoding]::UTF8.GetBytes($htmlContent)
$sha1        = [System.BitConverter]::ToString(
    [System.Security.Cryptography.SHA1]::Create().ComputeHash($htmlBytes)
).Replace("-","").ToLower()

$digestHeaders = @{
    "Authorization" = "Bearer $netlifyToken"
    "Content-Type"  = "application/json"
}
$digestBody = '{"files":{"/index.html":"' + $sha1 + '"}}'

try {
    # Debug: test auth first
    $testSite = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$siteId" `
        -Headers @{"Authorization"="Bearer $netlifyToken"}
    Write-Host "  Site found: $($testSite.name) - $($testSite.url)" -ForegroundColor Cyan

    # Create deploy with file digest
    $deploy = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$siteId/deploys" `
        -Method POST -Headers $digestHeaders -Body $digestBody

    $deployId = $deploy.id

    # Upload the file
    $uploadHeaders = @{
        "Authorization" = "Bearer $netlifyToken"
        "Content-Type"  = "application/octet-stream"
    }

    Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/deploys/$deployId/files/index.html" `
        -Method PUT -Headers $uploadHeaders -Body $htmlBytes | Out-Null

    Write-Host "Netlify deployed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "---------------------------------------------"
    Write-Host "All done! Dashboard live at:"
    Write-Host "https://gentle-frangollo-d9ae46.netlify.app"
    Write-Host "---------------------------------------------"
    Write-Host ""
} catch {
    $err = $_.Exception.Response
    if ($err) {
        $stream = $err.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body   = $reader.ReadToEnd()
        Write-Host "Netlify error $($err.StatusCode.value__): $body" -ForegroundColor Red
    } else {
        Write-Host "Netlify error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Read-Host "Press Enter to close"
