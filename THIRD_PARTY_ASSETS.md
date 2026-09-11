# Third-party 3D assets

The situation scene can use the following downloadable models. They are not authored by this repository and remain subject to their original licences.

## KJ-2000 AWACS

- Source: https://sketchfab.com/3d-models/kj-2000-awacs-b0eb176b53554f16b27994b7289ab9e2
- Author: SB-129 — https://sketchfab.com/hrd4588
- Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Runtime file: `public/models/awacs.glb`

Credit: This work is based on “KJ-2000 AWACS” by SB-129, licensed under CC BY 4.0.

## Wing Loong I UAV (War Thunder)

- Source: https://sketchfab.com/3d-models/wing-loong-i-uav-war-thunder-65ee1be90ae34b41a8e2464a4737131d
- Author: KojfDiscord — https://sketchfab.com/KojfDiscord
- Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Runtime file: `public/models/uav.glb`

Credit: This work is based on “Wing Loong I UAV (War Thunder)” by KojfDiscord, licensed under CC BY 4.0.

## Type-055 Destroyer

- Source: https://sketchfab.com/3d-models/type-055-destroyer-f0a96b2475da407eb6ea2b430ba9ea85
- Author: SB-129 — https://sketchfab.com/hrd4588
- Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Runtime file: `public/models/ship.glb`

Credit: This work is based on “Type-055 Destroyer” by SB-129, licensed under CC BY 4.0.

## Radar Station - WIP

- Source: https://sketchfab.com/3d-models/radar-station-wip-d9657bf768ce43f5b20411b036012a9d
- Author: Ingoldt — https://sketchfab.com/nilsolejonack
- Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Runtime file: `public/models/ground-station.glb`

Credit: This work is based on “Radar Station - WIP” by Ingoldt, licensed under CC BY 4.0.

## Command Center

- Source: https://sketchfab.com/3d-models/command-center-3cfb8b58b61e4faa8a0450d5eadb27ef
- Author: tjc997 — https://sketchfab.com/tjc997
- Licence: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Runtime file: `public/models/training-center.glb`

Credit: This work is based on “Command Center” by tjc997, licensed under CC BY 4.0.

## Import notes

The downloaded Sketchfab ZIP archives contain `scene.gltf`, `scene.bin`, optional textures, and `license.txt`. The repository includes `scripts/prepare-models.ps1` and `scripts/pack-gltf.mjs` to pack each archive into a self-contained GLB while preserving the original materials and textures.

Put the five ZIP files in `model-source/` using their original names, then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-models.ps1
```

The resulting GLB files are written to `public/models/`.
