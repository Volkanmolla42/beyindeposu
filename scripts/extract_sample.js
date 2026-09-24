const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\\Users\\volkan\\Desktop\\data.zip')
$entry = $zip.Entries | Where-Object { $_.FullName -match '201.01.0347' } | Select-Object -First 1
if ($entry) {
    [System.IO.Directory]::CreateDirectory('temp_sample')
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, 'temp_sample\\sample1.jpg', $true)
    Write-Output "Full Name: $($entry.FullName)"
}
$zip.Dispose()
`;

fs.writeFileSync('temp_extract.ps1', psScript);
const out = execSync('powershell -ExecutionPolicy Bypass -File temp_extract.ps1');
console.log(out.toString('utf-8'));
try { fs.unlinkSync('temp_extract.ps1'); } catch(e){}
