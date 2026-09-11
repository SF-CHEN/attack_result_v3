import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type SceneAssetId = 'uav' | 'awacs' | 'ship' | 'ground-station' | 'training-center'

export const MODEL_URLS: Record<SceneAssetId, string> = {
  uav: '/models/uav.glb',
  awacs: '/models/awacs.glb',
  ship: '/models/ship.glb',
  'ground-station': '/models/ground-station.glb',
  'training-center': '/models/training-center.glb',
}

const loader = new GLTFLoader()

export async function loadModelOrFallback(id: SceneAssetId, fallback: () => THREE.Object3D) {
  try {
    const gltf = await loader.loadAsync(MODEL_URLS[id])
    const root = gltf.scene
    root.name = id
    root.traverse((item) => {
      if (item instanceof THREE.Mesh) {
        item.castShadow = true
        item.receiveShadow = true
      }
    })
    return root
  } catch {
    const root = fallback()
    root.name = `${id}-fallback`
    return root
  }
}
