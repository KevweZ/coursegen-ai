Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = "public\Reference\Storyline-Templates\10013539 Playfair Course Starter 091619f\10013539 Playfair Course Starter 091619f.docx"
$extractPath = "$PWD\_temp_docx_extract"
if (Test-Path $extractPath) { Remove-Item -Recurse -Force $extractPath }
[System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $docxPath).Path, $extractPath)
Get-ChildItem -Path $extractPath -Recurse | Select-Object FullName
