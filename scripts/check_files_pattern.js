const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\\Users\\volkan\\Desktop\\data.zip')
$nonProduct = [System.Collections.Generic.List[string]]::new()
$validProducts = [System.Collections.Generic.List[string]]::new()

foreach ($entry in $zip.Entries) {
    if ($entry.Name -match '\\.(jpg|jpeg|png)$') {
        $name = $entry.Name
        # Genuine product codes follow pattern like 201.01.0347, 701.01.0001, 801.01..., 101.01...
        # or contain digits/standard stock format
        if ($name -match '^[0-9]{3}\.[0-9]{2}\.[0-9]+' -or $name -match '^[0-9]+[a-zA-Z0-9_\-\.]+') {
            if ($name -match '^(cd_|banner|logo|icon|button|thumb|header|bg|slider|empty|resim|adsiz)') {
                $nonProduct.Add($entry.FullName)
            } else {
                $validProducts.Add($entry.FullName)
            }
        } else {
            $nonProduct.Add($entry.FullName)
        }
    }
}
$zip.Dispose()

Write-Output "Non-product icons/banners: $($nonProduct.Count)"
Write-Output "Sample non-product: $($nonProduct | Select-Object -First 10)"
Write-Output "Valid product images: $($validProducts.Count)"
Write-Output "Sample valid: $($validProducts | Select-Object -First 10)"
`;

fs.writeFileSync('temp_check_files.ps1', psScript);
const out = execSync('powershell -ExecutionPolicy Bypass -File temp_check_files.ps1', { encoding: 'utf8' });
console.log(out);
try { fs.unlinkSync('temp_check_files.ps1'); } catch(e){}
