# Minimal static server for the DataKlicks site
$root = Join-Path $PSScriptRoot 'site'
$port = 8123
$prefix = "http://localhost:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Serving $root on $prefix"

$mimeMap = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.webp' = 'image/webp'
  '.woff' = 'font/woff'
  '.woff2' = 'font/woff2'
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $path = Join-Path $root $rel
      if (Test-Path -LiteralPath $path -PathType Container) {
        $path = Join-Path $path 'index.html'
      }
      if (Test-Path -LiteralPath $path -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        $ct = if ($mimeMap.ContainsKey($ext)) { $mimeMap[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $res.ContentType = $ct
        $res.StatusCode = 200
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "200 $rel ($($bytes.Length) bytes)"
      } else {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $rel")
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host "404 $rel"
      }
    } catch {
      try {
        $errMsg = [System.Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
        $res.StatusCode = 500
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $errMsg.Length
        $res.OutputStream.Write($errMsg, 0, $errMsg.Length)
      } catch {}
      Write-Host "500 $($_.Exception.Message)"
    } finally {
      try { $res.OutputStream.Close() } catch {}
      try { $res.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
