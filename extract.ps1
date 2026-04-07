$docxPath = "public\Reference\Storyline-Templates\10013539 Playfair Course Starter 091619f\10013539 Playfair Course Starter 091619f.docx"
$tempZip = ".\temp.zip"
$extractPath = ".\_temp_docx_extract"
$destPath = "public\Reference\Storyline-Templates\slides"

Copy-Item $docxPath $tempZip
New-Item -ItemType Directory -Force -Path $extractPath
Expand-Archive -Path $tempZip -DestinationPath $extractPath -Force

New-Item -ItemType Directory -Force -Path $destPath
$mediaPath = Join-Path $extractPath "word\media"
if (Test-Path $mediaPath) {
    $images = Get-ChildItem -Path $mediaPath | Sort-Object Name
    $counter = 1
    foreach ($img in $images) {
        $ext = $img.Extension
        $newName = "{0}{1}" -f $counter, $ext
        $newPath = Join-Path $destPath $newName
        Copy-Item $img.FullName -Destination $newPath
        $counter++
    }
    Write-Output "Extracted $($counter - 1) images."
} else {
    Write-Output "Media path not found: $mediaPath"
}
Remove-Item -Recurse -Force $extractPath
Remove-Item -Force $tempZip
