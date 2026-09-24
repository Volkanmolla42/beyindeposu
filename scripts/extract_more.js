const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\\Users\\volkan\\Desktop\\data.zip')
$entry1 = $zip.Entries | Where-Object { $_.FullName -match '701.01.0001' } | Select-Object -First 1
$entry2 = $zip.Entries | Where-Object { $_.FullName -match '801.01.0001' } | Select-Object -First 1
if ($entry1) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry1, 'temp_sample\\sample_vw.jpg', $true) }
if ($entry2) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry2, 'temp_sample\\sample_mb.jpg', $true) }
$zip.Dispose()
`;
fs.writeFileSync('temp_extract_more.ps1', psScript);
execSync('powershell -ExecutionPolicy Bypass -File temp_extract_more.ps1');
try { fs.unlinkSync('temp_extract_more.ps1'); } catch(e){}
