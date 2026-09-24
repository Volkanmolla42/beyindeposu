const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ZIP_SOURCE = 'C:\\Users\\volkan\\Desktop\\data.zip';
const DESKTOP_OUTPUT_ZIP = 'C:\\Users\\volkan\\Desktop\\products.zip';
const TEMP_EXTRACT_DIR = 'C:\\Users\\volkan\\Desktop\\temp_products_build\\products';

console.log('🖼️ 15.629 görsel temiz isimlerle "products.zip" arşivine dönüştürülüyor...');

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceZip = [System.IO.Compression.ZipFile]::OpenRead('${ZIP_SOURCE.replace(/\\/g, '\\\\')}')
$tempDir = '${TEMP_EXTRACT_DIR.replace(/\\/g, '\\\\')}'
$outZip = '${DESKTOP_OUTPUT_ZIP.replace(/\\/g, '\\\\')}'

if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
[System.IO.Directory]::CreateDirectory($tempDir) | Out-Null

$entries = $sourceZip.Entries | Where-Object { $_.Name -match '\\.(jpg|jpeg|png)$' }
$productGroups = @{}

Write-Host "Görseller gruplanıyor..."
foreach ($entry in $entries) {
    $fileName = $entry.Name
    $nameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $cleanCode = $nameWithoutExt -replace '_resized$', '' -replace '\\.[0-9]+[a-z]?$', ''
    $cleanCode = $cleanCode.Trim()
    
    if (-not $cleanCode) { continue }
    
    if (-not $productGroups.ContainsKey($cleanCode)) {
        $productGroups[$cleanCode] = [System.Collections.Generic.List[object]]::new()
    }
    $productGroups[$cleanCode].Add($entry)
}

Write-Host "Görseller temiz isimlerle çıkartılıyor..."
$count = 0
$total = $entries.Count

foreach ($code in $productGroups.Keys) {
    $safeCode = $code.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-'
    $list = $productGroups[$code]
    
    $idx = 1
    foreach ($entry in $list) {
        $newFileName = "$safeCode-$idx.jpg"
        $targetPath = Join-Path $tempDir $newFileName
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
        $idx++
        $count++
    }
    
    if ($count % 1500 -eq 0) {
        Write-Host "İlerleme: $count / $total görsel çıkartıldı..."
    }
}

$sourceZip.Dispose()

Write-Host "Desktop\\products.zip arşivi oluşturuluyor..."
if (Test-Path $outZip) { Remove-Item -Path $outZip -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory('C:\\Users\\volkan\\Desktop\\temp_products_build', $outZip)
Remove-Item -Path 'C:\\Users\\volkan\\Desktop\\temp_products_build' -Recurse -Force

Write-Host "✅ Başarıyla tamamlandı!"
`;

fs.writeFileSync('temp_pack_zip.ps1', psScript);
execSync('powershell -ExecutionPolicy Bypass -File temp_pack_zip.ps1', { stdio: 'inherit' });
try { fs.unlinkSync('temp_pack_zip.ps1'); } catch(e){}
