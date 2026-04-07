$mediaDir = "$PWD\_temp_docx_extract\media"
$destDir = "$PWD\public\Reference\Storyline-Templates\slides"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir }
$files = Get-ChildItem -Path $mediaDir -Filter "image*.bin" | Sort-Object { [int]($_.Name -replace '\D') }
$i = 1
foreach ($file in $files) {
    $dest = Join-Path $destDir "slide_$i.png"
    Copy-Item $file.FullName $dest
    $i++
}
Write-Output "Copied $($i-1) images to $destDir"
