$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$ip = (
  Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" } |
  Select-Object -ExpandProperty IPv4Address |
  Select-Object -ExpandProperty IPAddress -First 1
)

if (-not $ip) {
  $ip = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } |
    Select-Object -ExpandProperty IPAddress -First 1
  )
}

"{`"ip`":`"$ip`",`"port`":8080}" | Set-Content -Encoding utf8 "$root\lan.json"

Write-Host ""
Write-Host "Computer:  http://127.0.0.1:8080"
if ($ip) {
  Write-Host "Phone (same Wi-Fi):  http://$ip:8080"
}
Write-Host "Press Ctrl+C to stop"
Write-Host ""

$busy = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  Write-Host "Port 8080 is already running. Open the phone URL above."
} else {
  python -m http.server 8080 --bind 0.0.0.0
}
