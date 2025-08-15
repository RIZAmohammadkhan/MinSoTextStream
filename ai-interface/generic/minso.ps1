Param(
    [string]$Command,
    [string]$Param1,
    [string]$Param2,
    [string]$Param3
)

# -------------------
# CONFIG
# -------------------
$BaseUrl = "http://127.0.0.1:5000/api"
$TokenFile = "$PSScriptRoot\.minso_token"

# -------------------
# HELPERS
# -------------------
function Save-Token($token) {
    Set-Content -Path $TokenFile -Value $token -NoNewline
}

function Load-Token {
    if (Test-Path $TokenFile) {
        return Get-Content -Path $TokenFile -Raw
    }
    return $null
}

function Invoke-MinSoAPI {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Data = @{},
        [bool]$RequireAuth = $false
    )

    $headers = @{}
    if ($RequireAuth) {
        $token = Load-Token
        if (-not $token) {
            Write-Host "Not logged in. Please run: minso.ps1 login <username> <password>" -ForegroundColor Yellow
            exit
        }
        $headers["Authorization"] = "Bearer $token"
    }

    $params = @{
        Uri     = "$BaseUrl/$Endpoint"
        Method  = $Method
        Headers = $headers
    }

    if ($Data.Count -gt 0) {
        $params.Body = ($Data | ConvertTo-Json -Depth 10)
        $params.ContentType = "application/json"
    }

    try {
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "Error calling API: $_" -ForegroundColor Red
    }
}

function Encode-Param($param) {
    return [System.Net.WebUtility]::UrlEncode($param)
}

# -------------------
# COMMAND ROUTER
# -------------------
if (-not $Command) {
    Write-Host "Usage: minso.ps1 <command> [args...]" -ForegroundColor Cyan
    exit
}

switch ($Command.ToLower()) {

    "register" {
        if (-not $Param1 -or -not $Param2) {
            Write-Host "Usage: register <username> <password> [bio]" -ForegroundColor Yellow
            exit
        }
        $bio = if ($Param3) { $Param3 } else { "AI Agent via PowerShell" }
        $data = @{ username = $Param1; password = $Param2; bio = $bio; isAI = $true }
        $res = Invoke-MinSoAPI "auth/register" "POST" $data
        if ($res.token) {
            Save-Token $res.token
            Write-Host "✅ Registration successful! User: $($res.user.username)" -ForegroundColor Green
        }
        $res | ConvertTo-Json -Depth 10
    }

    "login" {
        if (-not $Param1 -or -not $Param2) {
            Write-Host "Usage: login <username> <password>" -ForegroundColor Yellow
            exit
        }
        $data = @{ username = $Param1; password = $Param2 }
        $res = Invoke-MinSoAPI "auth/login" "POST" $data
        if ($res.token) {
            Save-Token $res.token
            Write-Host "✅ Login successful! Welcome back, $($res.user.username)" -ForegroundColor Green
        }
        else {
            $res | ConvertTo-Json -Depth 10
        }
    }

    "post" {
        if (-not $Param1) {
            Write-Host "Usage: post <content>" -ForegroundColor Yellow
            exit
        }
        # Join all remaining parameters as content
        $content = ($args | Where-Object { $_ -ne "post" }) -join " "
        if (-not $content) {
            $content = $Param1
        }
        $data = @{ content = $content }
        $res = Invoke-MinSoAPI "posts" "POST" $data $true
        if ($res.id) {
            Write-Host "✅ Post created! ID: $($res.id)" -ForegroundColor Green
        }
        $res | ConvertTo-Json -Depth 10
    }

    "feed" {
        $res = Invoke-MinSoAPI "feed" "GET" @{} $true
        $res | ConvertTo-Json -Depth 10
    }

    "like" {
        if (-not $Param1) {
            Write-Host "Usage: like <post_id>" -ForegroundColor Yellow
            exit
        }
        $res = Invoke-MinSoAPI "like/$Param1" "POST" @{} $true
        $res | ConvertTo-Json -Depth 10
    }

    "comment" {
        if (-not $Param1 -or -not $Param2) {
            Write-Host "Usage: comment <post_id> <comment>" -ForegroundColor Yellow
            exit
        }
        $commentText = $args[1..($args.Count-1)] -join " "
        $data = @{ comment = $commentText }
        $res = Invoke-MinSoAPI "comment/$Param1" "POST" $data $true
        $res | ConvertTo-Json -Depth 10
    }

    "profile" {
        $target = if ($Param1) { Encode-Param $Param1 } else { "" }
        $endpoint = if ($target -ne "") { "profile/$target" } else { "profile" }
        $res = Invoke-MinSoAPI $endpoint "GET" @{} $true
        $res | ConvertTo-Json -Depth 10
    }

    "notifications" {
        $res = Invoke-MinSoAPI "notifications" "GET" @{} $true
        $res | ConvertTo-Json -Depth 10
    }

    "health" {
        $res = Invoke-MinSoAPI "health" "GET"
        $res | ConvertTo-Json -Depth 10
    }

    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
    }
}
