import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { gsap } from 'gsap'

import { loadModelOrFallback } from './modelRegistry'

export type FlowKey = 'groundToTraining' | 'trainingToUav' | 'trainingToAwacs' | 'uavToAwacs' | 'airToAwacs'
export type CameraShot = 'overview' | 'groundAttack' | 'training' | 'dispatch' | 'recognition' | 'fusion' | 'detection' | 'security' | 'airAttack'
export type SignalTone = 'info' | 'danger' | 'success' | 'warning'

interface FlowLine {
  line: THREE.Line
  glow: THREE.Line
  particles: THREE.Points
  curve: THREE.CatmullRomCurve3
  speed: number
}

interface CameraPreset {
  position: THREE.Vector3
  target: THREE.Vector3
  fov: number
}

interface NodeSignal {
  group: THREE.Group
  ringA: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  ringB: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  light: THREE.PointLight
}

const CAMERA_PRESETS: Record<CameraShot, CameraPreset> = {
  overview: { position: new THREE.Vector3(0, 16, 34), target: new THREE.Vector3(0, 2, 0), fov: 42 },
  groundAttack: { position: new THREE.Vector3(-15, 8.5, 24), target: new THREE.Vector3(-14, 1.3, 3.5), fov: 38 },
  training: { position: new THREE.Vector3(-7, 7.6, 18), target: new THREE.Vector3(-9, 1.6, 3), fov: 35 },
  dispatch: { position: new THREE.Vector3(2, 15, 30), target: new THREE.Vector3(1, 6.4, -1.2), fov: 40 },
  recognition: { position: new THREE.Vector3(10, 12.5, 29), target: new THREE.Vector3(12, 4.5, 5), fov: 38 },
  fusion: { position: new THREE.Vector3(4.5, 14.2, 18), target: new THREE.Vector3(1, 10.4, -7.5), fov: 34 },
  detection: { position: new THREE.Vector3(-13, 7.8, 22), target: new THREE.Vector3(-14, 1.5, 10), fov: 36 },
  security: { position: new THREE.Vector3(-1, 8.5, 23), target: new THREE.Vector3(-1.5, 1.5, 12), fov: 36 },
  airAttack: { position: new THREE.Vector3(13, 15, 27), target: new THREE.Vector3(9, 10, -7), fov: 38 },
}

const SIGNAL_COLORS: Record<SignalTone, number> = {
  info: 0x3ad7ff,
  danger: 0xff4f48,
  success: 0x35ffae,
  warning: 0xffb53b,
}

export class SituationScene {
  private readonly host: HTMLElement
  private readonly scene = new THREE.Scene()
  private readonly cameraRig = new THREE.Group()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500)
  private readonly cameraTarget = new THREE.Vector3(0, 2, 0)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  private readonly composer: EffectComposer
  private readonly clock = new THREE.Clock()
  private readonly nodes = new Map<string, THREE.Object3D>()
  private readonly flows = new Map<FlowKey, FlowLine>()
  private readonly signals = new Map<string, NodeSignal>()
  private readonly shake = { amount: 0 }
  private animationFrame = 0
  private oceanMaterial?: THREE.ShaderMaterial
  private targetBeam?: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>
  private scanPulse?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  private targetRing?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  private targetBrackets?: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
  private fusionGroup?: THREE.Group
  private trainingEnergy?: THREE.Group
  private recognitionActive = false
  private disposed = false

  constructor(host: HTMLElement) {
    this.host = host
    this.scene.background = new THREE.Color(0x020811)
    this.scene.fog = new THREE.FogExp2(0x04101b, 0.012)

    this.camera.position.copy(CAMERA_PRESETS.overview.position)
    this.cameraTarget.copy(CAMERA_PRESETS.overview.target)
    this.cameraRig.add(this.camera)
    this.scene.add(this.cameraRig)

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.renderer.setSize(host.clientWidth, host.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.outputToHost()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.82, 0.72, 0.76)
    this.composer.addPass(bloom)

    this.setupLights()
    this.setupEnvironment()
    this.setupLinks()
    void this.setupModels()
    this.resize()
    window.addEventListener('resize', this.resize)
    this.animate()
  }

  private outputToHost() {
    this.renderer.domElement.className = 'three-canvas'
    this.host.appendChild(this.renderer.domElement)
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x78cfff, 0x061017, 2.05))

    const moon = new THREE.DirectionalLight(0xaadfff, 4.2)
    moon.position.set(-14, 24, 9)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    moon.shadow.camera.near = 1
    moon.shadow.camera.far = 80
    this.scene.add(moon)

    const sunset = new THREE.PointLight(0xff9b59, 30, 58, 2)
    sunset.position.set(18, 9, -18)
    this.scene.add(sunset)

    const fill = new THREE.PointLight(0x16bfff, 18, 48, 2)
    fill.position.set(-15, 8, 16)
    this.scene.add(fill)
  }

  private setupEnvironment() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x041122) },
          horizonColor: { value: new THREE.Color(0x123752) },
          glowColor: { value: new THREE.Color(0x6b3f31) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 glowColor;
          varying vec2 vUv;
          void main() {
            float horizon = smoothstep(.08, .72, vUv.y);
            vec3 color = mix(horizonColor, topColor, horizon);
            float sunset = exp(-pow((vUv.y - .43) * 7.0, 2.0)) * smoothstep(.58, .95, vUv.x);
            color += glowColor * sunset * .55;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    )
    this.scene.add(sky)

    const terrainGeometry = new THREE.PlaneGeometry(72, 54, 48, 36)
    const terrainPositions = terrainGeometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < terrainPositions.count; index += 1) {
      const x = terrainPositions.getX(index)
      const y = terrainPositions.getY(index)
      const ridge = Math.max(0, 1 - Math.abs(x + 12) / 38)
      const noise = Math.sin(x * 0.23) * 0.55 + Math.cos(y * 0.19) * 0.46 + Math.sin((x + y) * 0.13) * 0.35
      terrainPositions.setZ(index, ridge * Math.max(0, noise) * 2.15)
    }
    terrainGeometry.computeVertexNormals()
    const land = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({ color: 0x071c1b, roughness: 0.9, metalness: 0.04 }),
    )
    land.rotation.x = -Math.PI / 2
    land.position.set(-14, -1.35, 2)
    land.receiveShadow = true
    this.scene.add(land)

    const grid = new THREE.GridHelper(62, 31, 0x0c86b8, 0x063247)
    grid.position.set(-10, -1.17, 1)
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => {
      material.transparent = true
      material.opacity = 0.11
      material.depthWrite = false
    })
    this.scene.add(grid)

    this.oceanMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(0x021623) },
        uShallow: { value: new THREE.Color(0x0a5a78) },
      },
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec3 p = position;
          float waveA = sin((p.x + uTime * 1.65) * .48) * .17;
          float waveB = cos((p.y - uTime * 1.05) * .71) * .11;
          float waveC = sin((p.x + p.y + uTime * .7) * 1.25) * .045;
          p.z += waveA + waveB + waveC;
          vWave = waveA + waveB + waveC;
          vec4 world = modelMatrix * vec4(p, 1.0);
          vWorldPosition = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        varying float vWave;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          float foam = smoothstep(.17, .28, vWave);
          float bands = sin((vWorldPosition.x + vWorldPosition.z) * 1.35) * .5 + .5;
          vec3 color = mix(uDeep, uShallow, vUv.y * .6 + .16);
          color += foam * vec3(.24, .62, .82);
          color += bands * .025 * vec3(.08, .34, .48);
          gl_FragColor = vec4(color, .96);
        }
      `,
    })
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(50, 60, 110, 110), this.oceanMaterial)
    ocean.rotation.x = -Math.PI / 2
    ocean.position.set(26, -1.08, -2)
    this.scene.add(ocean)

    const starsGeometry = new THREE.BufferGeometry()
    const stars = new Float32Array(1200)
    for (let i = 0; i < stars.length; i += 3) {
      stars[i] = (Math.random() - 0.5) * 110
      stars[i + 1] = Math.random() * 38 + 4
      stars[i + 2] = (Math.random() - 0.5) * 88
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    this.scene.add(
      new THREE.Points(
        starsGeometry,
        new THREE.PointsMaterial({ color: 0x7bcfff, size: 0.065, transparent: true, opacity: 0.48, depthWrite: false }),
      ),
    )

    const lightGeometry = new THREE.BufferGeometry()
    const lights = new Float32Array(270)
    for (let i = 0; i < lights.length; i += 3) {
      lights[i] = -30 + Math.random() * 35
      lights[i + 1] = -0.55 + Math.random() * 0.3
      lights[i + 2] = -13 + Math.random() * 32
    }
    lightGeometry.setAttribute('position', new THREE.BufferAttribute(lights, 3))
    this.scene.add(
      new THREE.Points(
        lightGeometry,
        new THREE.PointsMaterial({ color: 0xffc56a, size: 0.08, transparent: true, opacity: 0.58, depthWrite: false }),
      ),
    )
  }

  private makeBuilding(color = 0x0d4964) {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.2, 3.6),
      new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.5, emissive: 0x03141d }),
    )
    body.position.y = 0.1
    body.castShadow = true
    group.add(body)

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.72, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x12394f, metalness: 0.6, roughness: 0.34 }),
    )
    top.position.y = 1.56
    group.add(top)
    return group
  }

  private makeAircraft(kind: 'uav' | 'awacs') {
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({ color: kind === 'uav' ? 0xb7cbd5 : 0xcad6dc, metalness: 0.62, roughness: 0.27 })
    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(kind === 'uav' ? 0.3 : 0.45, kind === 'uav' ? 3.3 : 4.8, 8, 16), material)
    fuselage.rotation.z = Math.PI / 2
    group.add(fuselage)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(kind === 'uav' ? 6.7 : 7.4, 0.12, 1), material)
    group.add(wing)
    if (kind === 'awacs') {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.16, 40), material)
      dish.position.y = 1
      group.add(dish)
    }
    return group
  }

  private makeShip() {
    const group = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.72, 1.35), new THREE.MeshStandardMaterial({ color: 0x50626d, metalness: 0.55, roughness: 0.37 }))
    hull.rotation.y = -0.16
    group.add(hull)
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.8), new THREE.MeshStandardMaterial({ color: 0x7c8e96, metalness: 0.5, roughness: 0.38 }))
    tower.position.set(-0.2, 0.85, 0)
    group.add(tower)
    return group
  }

  private async setupModels() {
    const [training, station, uav, awacs, ship] = await Promise.all([
      loadModelOrFallback('training-center', () => this.makeBuilding(0x0c5574)),
      loadModelOrFallback('ground-station', () => this.makeBuilding(0x17435a)),
      loadModelOrFallback('uav', () => this.makeAircraft('uav')),
      loadModelOrFallback('awacs', () => this.makeAircraft('awacs')),
      loadModelOrFallback('ship', () => this.makeShip()),
    ])

    training.position.set(-9, 0, 3)
    this.addNode('training', training)

    station.position.set(2, 0, 4)
    station.scale.setScalar(0.78)
    this.addNode('groundStation', station)

    uav.position.set(13, 8.2, 1)
    uav.scale.setScalar(0.74)
    this.addNode('uav', uav)

    awacs.position.set(1, 11.4, -8)
    awacs.scale.setScalar(0.76)
    this.addNode('awacs', awacs)

    ship.position.set(18, -0.25, 10)
    ship.scale.setScalar(0.8)
    this.addNode('ship', ship)

    const groundSource = this.makeBuilding(0x421b20)
    groundSource.position.set(-21, 0, 4)
    groundSource.scale.setScalar(0.82)
    this.addNode('groundSource', groundSource)

    const detect = this.makeBuilding(0x0c493a)
    detect.position.set(-15, 0, 12)
    detect.scale.setScalar(0.76)
    this.addNode('detection', detect)

    const secure = this.makeBuilding(0x0b3d4b)
    secure.position.set(-1.5, 0, 13)
    secure.scale.setScalar(0.68)
    this.addNode('security', secure)

    const airSource = this.makeAircraft('uav')
    airSource.position.set(20, 13, -13)
    airSource.scale.setScalar(0.55)
    this.addNode('airSource', airSource)

    this.createRecognitionEffects()
  }

  private addNode(key: string, object: THREE.Object3D) {
    object.userData.baseY = object.position.y
    this.nodes.set(key, object)
    this.scene.add(object)
  }

  private setupLinks() {
    this.createFlow('groundToTraining', [new THREE.Vector3(-20, 1.3, 4), new THREE.Vector3(-15, 3.1, 3.7), new THREE.Vector3(-9, 1.8, 3)], 0xff554c, 0.25)
    this.createFlow('trainingToUav', [new THREE.Vector3(-8, 2.2, 3), new THREE.Vector3(1, 8.5, -1), new THREE.Vector3(13, 8.4, 1)], 0x45d5ff, 0.3)
    this.createFlow('trainingToAwacs', [new THREE.Vector3(-8, 2.4, 2), new THREE.Vector3(-3, 9.5, -4), new THREE.Vector3(1, 11.4, -8)], 0x45d5ff, 0.28)
    this.createFlow('uavToAwacs', [new THREE.Vector3(13, 8.5, 1), new THREE.Vector3(8, 12.5, -4), new THREE.Vector3(1, 11.5, -8)], 0xffbd43, 0.34)
    this.createFlow('airToAwacs', [new THREE.Vector3(20, 13, -13), new THREE.Vector3(10, 15.5, -12), new THREE.Vector3(1, 11.8, -8)], 0xff6d4f, 0.3)
  }

  private createFlow(key: FlowKey, points: THREE.Vector3[], color: number, speed: number) {
    const curve = new THREE.CatmullRomCurve3(points)
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120))
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false }))
    const glow = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.018, depthWrite: false }))
    glow.scale.setScalar(1.003)
    this.scene.add(glow, line)

    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(26 * 3)
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    this.scene.add(particles)
    this.flows.set(key, { line, glow, particles, curve, speed })
  }

  private createRecognitionEffects() {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1, 36, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x34cfff, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    beam.visible = false
    this.targetBeam = beam
    this.scene.add(beam)

    const scanPulse = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.67, 44),
      new THREE.MeshBasicMaterial({ color: 0x7de8ff, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    scanPulse.visible = false
    this.scanPulse = scanPulse
    this.scene.add(scanPulse)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.08, 52),
      new THREE.MeshBasicMaterial({ color: 0x49dcff, transparent: true, opacity: 0.76, side: THREE.DoubleSide, depthWrite: false }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    this.targetRing = ring
    this.scene.add(ring)

    const bracketPositions = new Float32Array([
      -2.2, 1.4, 0, -1.3, 1.4, 0, -2.2, 1.4, 0, -2.2, 0.5, 0,
      2.2, 1.4, 0, 1.3, 1.4, 0, 2.2, 1.4, 0, 2.2, 0.5, 0,
      -2.2, -1.4, 0, -1.3, -1.4, 0, -2.2, -1.4, 0, -2.2, -0.5, 0,
      2.2, -1.4, 0, 1.3, -1.4, 0, 2.2, -1.4, 0, 2.2, -0.5, 0,
    ])
    const bracketGeometry = new THREE.BufferGeometry()
    bracketGeometry.setAttribute('position', new THREE.BufferAttribute(bracketPositions, 3))
    const brackets = new THREE.LineSegments(
      bracketGeometry,
      new THREE.LineBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.9, depthTest: false }),
    )
    brackets.visible = false
    this.targetBrackets = brackets
    this.scene.add(brackets)
  }

  private createSignal(key: string, tone: SignalTone) {
    const node = this.nodes.get(key)
    if (!node) return undefined
    const color = SIGNAL_COLORS[tone]
    const group = new THREE.Group()
    const ringMaterialA = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    const ringMaterialB = ringMaterialA.clone()
    ringMaterialB.opacity = 0.32
    const ringA = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.42, 48), ringMaterialA)
    const ringB = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.88, 48), ringMaterialB)
    ringA.rotation.x = -Math.PI / 2
    ringB.rotation.x = -Math.PI / 2
    group.add(ringA, ringB)
    const light = new THREE.PointLight(color, 18, 11, 2)
    light.position.y = 1.2
    group.add(light)
    group.position.copy(node.position)
    group.position.y += key === 'uav' || key === 'awacs' || key === 'airSource' ? -0.8 : 0.05
    this.scene.add(group)
    const signal = { group, ringA, ringB, light }
    this.signals.set(key, signal)
    return signal
  }

  setNodeSignal(key: string, active: boolean, tone: SignalTone = 'info') {
    let signal = this.signals.get(key)
    if (!signal && active) signal = this.createSignal(key, tone)
    if (!signal) return
    signal.group.visible = active
    const color = SIGNAL_COLORS[tone]
    signal.ringA.material.color.setHex(color)
    signal.ringB.material.color.setHex(color)
    signal.light.color.setHex(color)
  }

  setFlowState(key: FlowKey, state: 'hidden' | 'active' | 'locked') {
    const flow = this.flows.get(key)
    if (!flow) return
    const material = flow.line.material as THREE.LineBasicMaterial
    const glowMaterial = flow.glow.material as THREE.LineBasicMaterial
    const particleMaterial = flow.particles.material as THREE.PointsMaterial

    if (state === 'hidden') {
      gsap.to(material, { opacity: 0.045, duration: 0.55 })
      gsap.to(glowMaterial, { opacity: 0.012, duration: 0.55 })
      gsap.to(particleMaterial, { opacity: 0, duration: 0.3 })
    } else if (state === 'locked') {
      gsap.to(material, { opacity: 0.48, duration: 0.55 })
      gsap.to(glowMaterial, { opacity: 0.18, duration: 0.55 })
      gsap.to(particleMaterial, { opacity: 0, duration: 0.35 })
    } else {
      gsap.to(material, { opacity: 0.94, duration: 0.35 })
      gsap.to(glowMaterial, { opacity: 0.4, duration: 0.35 })
      gsap.to(particleMaterial, { opacity: 1, duration: 0.38 })
    }
  }

  cameraShot(shot: CameraShot, duration = 1.55) {
    const preset = CAMERA_PRESETS[shot]
    gsap.to(this.camera.position, {
      x: preset.position.x,
      y: preset.position.y,
      z: preset.position.z,
      duration,
      ease: 'power3.inOut',
    })
    gsap.to(this.cameraTarget, {
      x: preset.target.x,
      y: preset.target.y,
      z: preset.target.z,
      duration,
      ease: 'power3.inOut',
    })
    gsap.to(this.camera, { fov: preset.fov, duration, ease: 'power2.inOut', onUpdate: () => this.camera.updateProjectionMatrix() })
  }

  focusNode(key: string) {
    const node = this.nodes.get(key)
    if (!node) return
    const target = node.position.clone()
    gsap.to(this.cameraTarget, { x: target.x, y: target.y, z: target.z, duration: 1.25, ease: 'power2.inOut' })
    gsap.to(this.camera.position, {
      x: target.x * 0.35,
      y: Math.max(10, target.y + 8),
      z: target.z + 25,
      duration: 1.45,
      ease: 'power2.inOut',
    })
  }

  resetCamera() {
    this.cameraShot('overview', 1.35)
  }

  setTrainingEnergy(active: boolean, hardened = false) {
    if (!this.trainingEnergy) {
      const group = new THREE.Group()
      for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.05 + i * 0.48, 1.13 + i * 0.48, 56),
          new THREE.MeshBasicMaterial({ color: 0x43d9ff, transparent: true, opacity: 0.18 + i * 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.06 + i * 0.08
        group.add(ring)
      }
      const light = new THREE.PointLight(0x36cfff, 25, 16, 2)
      light.position.y = 2.3
      group.add(light)
      group.visible = false
      this.trainingEnergy = group
      this.scene.add(group)
    }

    const training = this.nodes.get('training')
    if (training) {
      this.trainingEnergy.position.copy(training.position)
      this.trainingEnergy.position.y += 0.04
    }
    this.trainingEnergy.visible = active
    const color = hardened ? 0x56ffb6 : 0x43d9ff
    this.trainingEnergy.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) object.material.color.setHex(color)
      if (object instanceof THREE.PointLight) object.color.setHex(color)
    })
  }

  setFusion(active: boolean) {
    if (!this.fusionGroup) {
      const group = new THREE.Group()
      ;[1.45, 2.15, 2.9].forEach((radius, index) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radius, 0.045, 8, 64),
          new THREE.MeshBasicMaterial({ color: index === 1 ? 0xffb548 : 0x50dcff, transparent: true, opacity: 0.55 - index * 0.1, depthWrite: false, blending: THREE.AdditiveBlending }),
        )
        ring.rotation.x = Math.PI / 2
        ring.rotation.z = index * 0.6
        group.add(ring)
      })
      group.visible = false
      this.fusionGroup = group
      this.scene.add(group)
    }
    this.fusionGroup.visible = active
  }

  showRecognition(active: boolean) {
    this.recognitionActive = active
    if (this.targetBeam) this.targetBeam.visible = active
    if (this.scanPulse) this.scanPulse.visible = active
    if (this.targetRing) this.targetRing.visible = active
    if (this.targetBrackets) this.targetBrackets.visible = active
  }

  pulseNode(key: string, color = 0x52ddff) {
    const node = this.nodes.get(key)
    if (!node) return
    const start = node.scale.clone()
    gsap.timeline()
      .to(node.scale, { x: start.x * 1.06, y: start.y * 1.06, z: start.z * 1.06, duration: 0.2, ease: 'power2.out' })
      .to(node.scale, { x: start.x, y: start.y, z: start.z, duration: 0.55, ease: 'elastic.out(1,.55)' })
    this.burstAt(node.position, color, key === 'uav' || key === 'awacs' ? 1.6 : 1)
  }

  burstNode(key: string, color = 0x52ddff) {
    const node = this.nodes.get(key)
    if (node) this.burstAt(node.position, color, key === 'uav' || key === 'awacs' ? 1.45 : 1)
  }

  private burstAt(position: THREE.Vector3, color: number, scale = 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 52), material)
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(position)
    ring.position.y += 0.08
    ring.scale.setScalar(scale)
    this.scene.add(ring)
    gsap.to(ring.scale, { x: scale * 5, y: scale * 5, z: scale * 5, duration: 1.15, ease: 'power2.out' })
    gsap.to(material, {
      opacity: 0,
      duration: 1.15,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.remove(ring)
        ring.geometry.dispose()
        material.dispose()
      },
    })
  }

  shakeCamera(intensity = 0.12, duration = 0.65) {
    gsap.killTweensOf(this.shake)
    this.shake.amount = intensity
    gsap.to(this.shake, { amount: 0, duration, ease: 'power3.out' })
  }

  private updateParticles(elapsed: number) {
    for (const [index, flow] of [...this.flows.values()].entries()) {
      const material = flow.particles.material as THREE.PointsMaterial
      if (material.opacity < 0.02) continue
      const attribute = flow.particles.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < attribute.count; i += 1) {
        const t = (elapsed * (flow.speed + index * 0.012) + i / attribute.count) % 1
        const point = flow.curve.getPoint(t)
        attribute.setXYZ(i, point.x, point.y, point.z)
      }
      attribute.needsUpdate = true
    }
  }

  private updateSignals(elapsed: number) {
    for (const [key, signal] of this.signals) {
      if (!signal.group.visible) continue
      const node = this.nodes.get(key)
      if (node) {
        signal.group.position.copy(node.position)
        signal.group.position.y += key === 'uav' || key === 'awacs' || key === 'airSource' ? -0.8 : 0.05
      }
      const pulse = 1 + Math.sin(elapsed * 3.1) * 0.08
      signal.ringA.scale.setScalar(pulse)
      signal.ringB.scale.setScalar(1 + ((elapsed * 0.45) % 1) * 0.5)
      signal.ringB.material.opacity = 0.32 * (1 - ((elapsed * 0.45) % 1))
      signal.ringA.rotation.z = elapsed * 0.28
      signal.ringB.rotation.z = -elapsed * 0.2
      signal.light.intensity = 15 + Math.sin(elapsed * 3.4) * 4
    }
  }

  private updateRecognition(elapsed: number) {
    if (!this.recognitionActive) return
    const uav = this.nodes.get('uav')
    const ship = this.nodes.get('ship')
    if (!uav || !ship || !this.targetBeam || !this.scanPulse || !this.targetRing || !this.targetBrackets) return

    const from = uav.position.clone()
    from.y -= 0.6
    const to = ship.position.clone()
    to.y += 0.25
    const direction = new THREE.Vector3().subVectors(to, from)
    const distance = direction.length()
    const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
    const normalized = direction.clone().normalize()

    this.targetBeam.position.copy(midpoint)
    this.targetBeam.scale.set(1, distance, 1)
    this.targetBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), normalized)
    this.targetBeam.material.opacity = 0.085 + Math.sin(elapsed * 2.2) * 0.02

    const scanT = (elapsed * 0.43) % 1
    this.scanPulse.position.lerpVectors(from, to, scanT)
    this.scanPulse.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalized)
    this.scanPulse.scale.setScalar(0.7 + scanT * 4.2)
    this.scanPulse.material.opacity = 0.72 * (1 - scanT * 0.65)

    this.targetRing.position.copy(to)
    this.targetRing.position.y = -0.5
    this.targetRing.rotation.z = elapsed * 0.72
    const lockPulse = 1 + Math.sin(elapsed * 4.5) * 0.06
    this.targetRing.scale.setScalar(lockPulse)

    this.targetBrackets.position.copy(to)
    this.targetBrackets.position.y += 1.1
    this.targetBrackets.quaternion.copy(this.camera.quaternion)
    this.targetBrackets.scale.setScalar(1 + Math.sin(elapsed * 4.8) * 0.04)
  }

  private updateEnergy(elapsed: number) {
    if (this.trainingEnergy?.visible) {
      this.trainingEnergy.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.z = elapsed * (index % 2 === 0 ? 0.48 : -0.38) * (1 + index * 0.15)
          const scale = 1 + Math.sin(elapsed * 2.8 + index) * 0.045
          child.scale.setScalar(scale)
        }
      })
    }

    if (this.fusionGroup?.visible) {
      const awacs = this.nodes.get('awacs')
      if (awacs) this.fusionGroup.position.copy(awacs.position)
      this.fusionGroup.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) child.rotation.z = elapsed * (index % 2 === 0 ? 0.55 : -0.42) + index
      })
    }
  }

  private animate = () => {
    if (this.disposed) return
    this.animationFrame = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    if (this.oceanMaterial) this.oceanMaterial.uniforms.uTime.value = elapsed
    this.updateParticles(elapsed)
    this.updateSignals(elapsed)
    this.updateRecognition(elapsed)
    this.updateEnergy(elapsed)

    const uav = this.nodes.get('uav')
    const awacs = this.nodes.get('awacs')
    const airSource = this.nodes.get('airSource')
    if (uav) {
      uav.position.y = Number(uav.userData.baseY) + Math.sin(elapsed * 0.72) * 0.16
      uav.rotation.z = Math.sin(elapsed * 0.34) * 0.012
    }
    if (awacs) {
      awacs.position.y = Number(awacs.userData.baseY) + Math.sin(elapsed * 0.55 + 1.2) * 0.13
      awacs.rotation.z = Math.sin(elapsed * 0.28 + 1) * 0.009
    }
    if (airSource) airSource.position.y = Number(airSource.userData.baseY) + Math.sin(elapsed * 0.63 + 2) * 0.12

    this.cameraRig.position.x = Math.sin(elapsed * 1.9) * this.shake.amount
    this.cameraRig.position.y = Math.cos(elapsed * 2.5) * this.shake.amount * 0.55
    this.cameraRig.rotation.z = Math.sin(elapsed * 0.21) * 0.0018 + Math.sin(elapsed * 3.6) * this.shake.amount * 0.008
    this.camera.lookAt(this.cameraTarget)

    this.composer.render()
  }

  private resize = () => {
    const width = this.host.clientWidth || window.innerWidth
    const height = this.host.clientHeight || window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.composer.setSize(width, height)
  }

  resetEffects() {
    this.showRecognition(false)
    this.setFusion(false)
    this.setTrainingEnergy(false)
    this.signals.forEach((signal) => { signal.group.visible = false })
    this.setFlowState('groundToTraining', 'hidden')
    this.setFlowState('trainingToUav', 'hidden')
    this.setFlowState('trainingToAwacs', 'hidden')
    this.setFlowState('uavToAwacs', 'hidden')
    this.setFlowState('airToAwacs', 'hidden')
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    gsap.killTweensOf(this.camera.position)
    gsap.killTweensOf(this.cameraTarget)
    gsap.killTweensOf(this.camera)
    this.renderer.dispose()
    this.host.replaceChildren()
  }
}
