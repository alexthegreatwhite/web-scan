# Script d'assimilation totale des catalogues WMS et Caisse Paris Store
$ErrorActionPreference = "SilentlyContinue"

$fPath = "C:\Users\dam6.dam\Documents\projet 2\VERSION_PRODUCTION_INTRANET\TempSync\FicheArticle.txt"
if (-not (Test-Path $fPath)) {
    $fPath = "\\192.168.10.251\wms\FicheArticle.txt"
}
$sPath = "\\192.168.10.251\wms\Stock_Dluo.txt"
$outPath = Join-Path $PSScriptRoot "..\public\data\catalog.json"
$distOutPath = Join-Path $PSScriptRoot "..\dist\data\catalog.json"

Write-Host "1. Lecture des bases WMS..." -ForegroundColor Cyan
$lines = [System.IO.File]::ReadAllLines($fPath, [System.Text.Encoding]::UTF8)
$articles = [System.Collections.Generic.Dictionary[string, hashtable]]::new()
$nameMap = @{}
$cleanName = { param($s) ($s -replace '\b(VN|TH|FR|CH|TW|JP|CN|HK|KR|ITL|USA|MG|IN)\b', '' -replace '[^A-Z0-9]', '').ToUpper() }

for ($i = 1; $i -lt $lines.Length; $i++) {
    $line = $lines[$i].Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line.Split(';')
    if ($parts.Length -lt 7) { continue }
    $rawCode = $parts[0].Trim()
    if ([string]::IsNullOrWhiteSpace($rawCode)) { continue }
    $code = $rawCode.PadLeft(6, '0')
    $libelle = if ($parts.Length -gt 1 -and !([string]::IsNullOrWhiteSpace($parts[1]))) { $parts[1].Trim() } else { "ARTICLE $code" }
    $pcbVal = 1
    [int]::TryParse($parts[6].Trim(), [ref]$pcbVal) | Out-Null
    if ($pcbVal -lt 1) { $pcbVal = 1 }
    $ean = ""
    if ($parts.Length -gt 14) {
        $rawEan = $parts[14].Trim()
        if ($rawEan -ne "" -and $rawEan -ne "NULL" -and $rawEan.Length -ge 8) {
            $ean = $rawEan
        }
    }
    $articles[$code] = @{ c = $code; n = $libelle; e = $ean; p = $pcbVal; a = [System.Collections.Generic.HashSet[string]]::new() }
    $norm = & $cleanName $libelle
    if ($norm.Length -ge 4 -and -not $nameMap.ContainsKey($norm)) {
        $nameMap[$norm] = $code
    }
}

if (Test-Path $sPath) {
    $sLines = [System.IO.File]::ReadAllLines($sPath, [System.Text.Encoding]::GetEncoding("ISO-8859-1"))
    for ($i = 0; $i -lt $sLines.Length; $i++) {
        $line = $sLines[$i].Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $parts = $line.Split(';')
        if ($parts.Length -lt 4) { continue }
        $rawCode = $parts[0].Trim()
        if ([string]::IsNullOrWhiteSpace($rawCode)) { continue }
        $code = $rawCode.PadLeft(6, '0')
        if (-not $articles.ContainsKey($code)) {
            $libelle = if (!([string]::IsNullOrWhiteSpace($parts[1]))) { $parts[1].Trim() } else { "ARTICLE $code" }
            $ean = ""
            $rawEan = $parts[2].Trim()
            if ($rawEan -ne "" -and $rawEan -ne "NULL" -and $rawEan.Length -ge 8) { $ean = $rawEan }
            $pcbVal = 1
            [int]::TryParse($parts[3].Trim(), [ref]$pcbVal) | Out-Null
            if ($pcbVal -lt 1) { $pcbVal = 1 }
            $articles[$code] = @{ c = $code; n = $libelle; e = $ean; p = $pcbVal; a = [System.Collections.Generic.HashSet[string]]::new() }
            $norm = & $cleanName $libelle
            if ($norm.Length -ge 4 -and -not $nameMap.ContainsKey($norm)) { $nameMap[$norm] = $code }
        } else {
            $existing = $articles[$code]
            if ([string]::IsNullOrEmpty($existing["e"]) -and $parts.Length -gt 2) {
                $rawEan = $parts[2].Trim()
                if ($rawEan -ne "" -and $rawEan -ne "NULL" -and $rawEan.Length -ge 8) {
                    $existing["e"] = $rawEan
                }
            }
        }
    }
}

Write-Host "2. Assimilation des tables caisse ACKB du serveur..." -ForegroundColor Cyan
$skuToCode = @{}

# ALCART
$alcartFiles = Get-ChildItem -Path "\\192.168.10.251\disque_c\ACKB\base\0013-DAM13\ALCART", "\\192.168.10.251\disque_c\ACKB\base\0013-MAG13\ALCART", "\\192.168.10.251\disque_c\ACKB\base\0093-MAG93\ALCART", "\\192.168.10.251\disque_c\ACKB\base\0001-SIEGE941\ALCART", "\\192.168.10.251\disque_c\ACKB\base\0016-SIEGE9416\ALCART" -ErrorAction SilentlyContinue
foreach ($f in $alcartFiles) {
    $aLines = [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::GetEncoding("ISO-8859-1"))
    for ($i = 1; $i -lt $aLines.Length; $i++) {
        $p = $aLines[$i].Trim().Split(';')
        if ($p.Length -ge 4) {
            $sku = $p[0].Trim()
            $ref = $p[1].Trim()
            $ean = $p[2].Trim()
            if ($ref.Length -ge 6) {
                $code = $ref.Substring($ref.Length - 6)
                if ($code -match '^\d{6}$' -and $articles.ContainsKey($code)) {
                    $skuToCode[$sku] = $code
                    if ($ean.Length -ge 8 -and $ean -ne "NULL" -and $ean -ne $articles[$code]["e"]) {
                        [void]$articles[$code]["a"].Add($ean)
                    }
                }
            }
        }
    }
}

# IKSALC.DAT
$iksalcFiles = Get-ChildItem -Path "\\192.168.10.251\disque_c\ACKB\trans\0013\IKSALC.DAT", "\\192.168.10.251\disque_c\ACKB\trans\IKSALC.DAT" -ErrorAction SilentlyContinue
foreach ($f in $iksalcFiles) {
    $iLines = [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::GetEncoding("ISO-8859-1"))
    foreach ($line in $iLines) {
        if ($line.Length -ge 26) {
            $sku = $line.Substring(0, 13).TrimStart('0')
            $ean = $line.Substring(13, 13).Trim()
            if ($skuToCode.ContainsKey($sku)) {
                $code = $skuToCode[$sku]
                if ($ean.Length -ge 8 -and $ean -ne $articles[$code]["e"]) {
                    [void]$articles[$code]["a"].Add($ean)
                }
            }
        }
    }
}

# JART.DAT
$jartFiles = Get-ChildItem -Path "\\192.168.10.251\disque_c\ACKB\base\*-TPV\JART.DAT" -ErrorAction SilentlyContinue
foreach ($f in $jartFiles) {
    $jLines = [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::GetEncoding("ISO-8859-1"))
    foreach ($line in $jLines) {
        if ($line.Length -ge 130) {
            $ean = $line.Substring(5, 13).Trim()
            $sku = $line.Substring(18, 13).TrimStart('0')
            if ($ean.Length -ge 8) {
                if ($skuToCode.ContainsKey($sku)) {
                    $code = $skuToCode[$sku]
                    if ($ean -ne $articles[$code]["e"]) {
                        [void]$articles[$code]["a"].Add($ean)
                    }
                } else {
                    $desigMatch = [regex]::Match($line, '(?<desig>[A-Z][A-Z0-9\s\.\/]{3,})\s*$')
                    if ($desigMatch.Success) {
                        $norm = & $cleanName $desigMatch.Groups['desig'].Value
                        if ($nameMap.ContainsKey($norm)) {
                            $code = $nameMap[$norm]
                            if ($ean -ne $articles[$code]["e"]) {
                                [void]$articles[$code]["a"].Add($ean)
                            }
                        }
                    }
                }
            }
        }
    }
}

Write-Host "3. Génération du catalogue JSON optimisé..." -ForegroundColor Cyan
$exportArr = [System.Collections.Generic.List[object]]::new()
$totalAliases = 0
foreach ($art in $articles.Values) {
    $aliasList = [string[]]($art["a"] | ForEach-Object { $_ })
    $totalAliases += $aliasList.Length
    $item = @{
        c = $art["c"]
        n = $art["n"]
        e = $art["e"]
        p = $art["p"]
    }
    if ($aliasList.Length -gt 0) {
        $item["a"] = $aliasList
    }
    $exportArr.Add($item)
}

$json = ConvertTo-Json -InputObject $exportArr -Compress
[System.IO.File]::WriteAllText($outPath, $json, [System.Text.Encoding]::UTF8)
if (Test-Path (Split-Path $distOutPath)) {
    [System.IO.File]::WriteAllText($distOutPath, $json, [System.Text.Encoding]::UTF8)
}

Write-Host "Succès : $($articles.Count) articles et $totalAliases codes-barres caisse assimilés." -ForegroundColor Green