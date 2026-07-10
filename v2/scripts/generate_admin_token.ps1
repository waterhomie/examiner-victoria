param(
    [ValidateRange(24, 128)]
    [int]$Length = 48
)

$ErrorActionPreference = "Stop"

$alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_"
$bytes = [byte[]]::new($Length)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($bytes)
} finally {
    $rng.Dispose()
}

$chars = for ($index = 0; $index -lt $Length; $index += 1) {
    $alphabet[$bytes[$index] % $alphabet.Length]
}

$token = -join $chars
Write-Host "ADMIN_TOKEN=$token"
Write-Host ""
Write-Host "Paste this into Railway -> Variables as ADMIN_TOKEN. Keep it private."
