import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type SceneAssetId = 'uav' | 'awacs' | 'ship' | 'ground-station' | 'training-center'

type ModelAnchor = 'center' | 'ground'

interface ModelProfile {
  url: string
  targetSize: number
  anchor: ModelAnchor
  rotationY: number
}

/**
 * Real models from different sources use wildly different units.
 * Keep the scene layout stable by normalising every asset once at load time.
 */
const MODEL_PROFILES: Record<SceneAssetId, ModelProfile> = {
  uav: {
    url: '/models/uav.glb',
    targetSize: 8,
    anchor: 'center',
    rotationY: -0.18,
  },
  awacs: {
    url: '/models/awacs.glb',
    targetSize: 10,
    anchor: 'center',
    rotationY: 0.35,
  },
  ship: {
    url: '/models/ship.glb',
    targetSize: 7,
    anchor: 'ground',
    rotationY: -0.12,
  },
  'ground-station': {
    url: '/models/ground-station.glb',
    targetSize: 5,
    anchor: 'ground',
    rotationY: -0.28,
  },
  'training-center': {
    url: '/models/training-center.glb',
    targetSize: 5.6,
    anchor: 'ground',
    rotationY: 0.16,
  },
}

export const MODEL_URLS = Object.fromEntries(
  Object.entries(MODEL_PROFILES).map(([id, profile]) => [id, profile.url]),
) as Record<SceneAssetId, string>

const loader = new GLTFLoader()

function prepareMaterials(root: THREE.Object3D) {
  root.traverse((item) => {
    if (!(item instanceof THREE.Mesh)) return

    item.castShadow = true
    item.receiveShadow = true

    const materials = Array.isArray(item.material) ? item.material : [item.material]
    materials.forEach((material) => {
      // Imported assets should react to the scene lighting instead of looking flat.
      if ('envMapIntensity' in material) {
        material.envMapIntensity = 0.8
      }
      material.needsUpdate = true
    })
  })
}

function normalizeModel(root: THREE.Object3D, profile: ModelProfile) {
  const wrapper = new THREE.Group()
  wrapper.rotation.y = profile.rotationY
  wrapper.add(root)

  root.updateWorldMatrix(true, true)
  let bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  const longestSide = Math.max(size.x, size.y, size.z)

  if (Number.isFinite(longestSide) && longestSide > 0) {
    root.scale.multiplyScalar(profile.targetSize / longestSide)
  }

  root.updateWorldMatrix(true, true)
  bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())

  // X/Z are always centred so positioning a node in SituationScene is predictable.
  root.position.x -= center.x
  root.position.z -= center.z

  if (profile.anchor === 'ground') {
    root.position.y -= bounds.min.y
  } else {
    root.position.y -= center.y
  }

  wrapper.userData.assetReady = true
  return wrapper
}

export async function loadModelOrFallback(id: SceneAssetId, fallback: () => THREE.Object3D) {
  const profile = MODEL_PROFILES[id]

  try {
    const gltf = await loader.loadAsync(profile.url)
    const root = gltf.scene
    root.name = id
    prepareMaterials(root)

    const model = normalizeModel(root, profile)
    model.name = id
    return model
  } catch (error) {
    console.warn(`[scene] Failed to load ${id}, using fallback geometry.`, error)
    const root = fallback()
    root.name = `${id}-fallback`
    root.userData.assetReady = false
    return root
  }
}
