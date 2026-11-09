# Creates the key pair for push reminders (VAPID). Run once:
#   powershell -ExecutionPolicy Bypass -File push\make-vapid-keys.ps1
# Public key  -> js/config.js (vapidPublicKey) and Supabase secret VAPID_PUBLIC_KEY
# Private key -> only the Supabase secret VAPID_PRIVATE_KEY. Never put it in the app or on GitHub.

function B64Url([byte[]]$b) { [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
function Pad32([byte[]]$b) { if ($b.Length -ge 32) { return $b } ; return ([byte[]](New-Object byte[] (32 - $b.Length))) + $b }

$ec = [System.Security.Cryptography.ECDsa]::Create([System.Security.Cryptography.ECCurve+NamedCurves]::nistP256)
$p = $ec.ExportParameters($true)
[byte[]]$pub = @([byte]4) + (Pad32 $p.Q.X) + (Pad32 $p.Q.Y)
[byte[]]$priv = Pad32 $p.D

Write-Host ""
Write-Host "VAPID_PUBLIC_KEY  = $(B64Url $pub)"
Write-Host "VAPID_PRIVATE_KEY = $(B64Url $priv)"
Write-Host ""
Write-Host "Keep the private key secret. Running this again creates a new pair (devices then have to turn reminders on again)."
