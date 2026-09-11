$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root 'model-source'
$tempDir = Join-Path $root '.model-temp'
$outputDir = Join-Path $root 'public\models'

$models = @(
  @{ Zip = 'kj-2000_awacs.zip'; Output = 'awacs.glb' },
  @{ Zip = 'wing_loong_i_uav_war_thunder.zip'; Output = 'uav.glb' },
  @{ Zip = 'type-055_destroyer.zip'; Output = 'ship.glb' },
  @{ Zip = 'radar_station_-_wip.zip'; Output = 'ground-station.glb' },
  @{ Zip = 'command_center.zip'; Output = 'training-center.glb' }
)

New-Item -ItemType Directory -Force -Path $sourceDir, $tempDir, $outputDir | Out-Null

foreach ($model in $models) {
  $zipPath = Join-Path $sourceDir $model.Zip
  if (-not (Test-Path $zipPath)) {
    Write-Warning "Missing $($model.Zip). Put it in model-source/ and run again."
    continue
  }

  $name = [System.IO.Path]::GetFileNameWithoutExtension($model.Zip)
  $extractDir = Join-Path $tempDir $name
  if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
  }

  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  $gltfPath = Join-Path $extractDir 'scene.gltf'
  if (-not (Test-Path $gltfPath)) {
    throw "scene.gltf was not found in $($model.Zip)"
  }

  $outputPath = Join-Path $outputDir $model.Output
  node (Join-Path $PSScriptRoot 'pack-gltf.mjs') $gltfPath $outputPath
}

if (Test-Path $tempDir) {
  Remove-Item -Recurse -Force $tempDir
}

Write-Host ''
Write-Host 'Model preparation finished.' -ForegroundColor Green
Write-Host 'Expected runtime assets:'
Get-ChildItem $outputDir -Filter *.glb | ForEach-Object {
  Write-Host ('  {0,-22} {1,7:N2} MB' -f $_.Name, ($_.Length / 1MB))
}
