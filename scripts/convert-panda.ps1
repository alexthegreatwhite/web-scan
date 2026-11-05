Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\Alex\.gemini\antigravity\brain\3cc2d90e-2724-4ae7-9408-4bec2488e10e\panda_500_euro_icon_1793920187724.jpg"
$destDir = "C:\Users\Alex\Desktop\paris_store_scan_web\public\icons"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 192x192
$thumb192 = New-Object System.Drawing.Bitmap(192, 192)
$g192 = [System.Drawing.Graphics]::FromImage($thumb192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.DrawImage($bmp, 0, 0, 192, 192)
$thumb192.Save((Join-Path $destDir "icon-192.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g192.Dispose()
$thumb192.Dispose()

# 512x512
$thumb512 = New-Object System.Drawing.Bitmap(512, 512)
$g512 = [System.Drawing.Graphics]::FromImage($thumb512)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g512.DrawImage($bmp, 0, 0, 512, 512)
$thumb512.Save((Join-Path $destDir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g512.Dispose()
$thumb512.Dispose()

# Favicon PNG
$thumb64 = New-Object System.Drawing.Bitmap(64, 64)
$g64 = [System.Drawing.Graphics]::FromImage($thumb64)
$g64.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g64.DrawImage($bmp, 0, 0, 64, 64)
$thumb64.Save("C:\Users\Alex\Desktop\paris_store_scan_web\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g64.Dispose()
$thumb64.Dispose()

$bmp.Dispose()
Write-Host "Icons converted successfully!"
Get-ChildItem $destDir
