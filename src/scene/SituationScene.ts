import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { gsap } from 'gsap'

import { loadModelOrFallback } from './modelRegistry'

export type FlowKey = 'groundToTraining' | 'trainingToUav' | 'trainingToAwacs' | 'uavToAwacs' | 'airToAwacs'

interface FlowLine {
  line: THREE.Line
  particles: THREE.Points
  curve: THREE.CatmullRomCurve3
}

export class SituationScene {
  private readonly host: HTMLElement
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  private readonly composer: EffectComposer
  private readonly clock = new THREE.Clock()
  private readonly nodes = new Map<string, THREE.Object3D>()
  private readonly flows = new Map<FlowKey, FlowLine>()
  private animationFrame = 0
  private oceanMaterial?: THREE.ShaderMaterial
  private targetBeam?: THREE.Mesh
  private targetRing?: THREE.Mesh
  private disposed = false

  constructor(host: HTMLElement) {
    this.host = host
    this.scene.background = new THREE.Color(0x020b14)
    this.scene.fog = new THREE.FogExp2(0x04101b, 0.013)

    this.camera.position.set(0, 16, 34)
    this.camera.lookAt(0, 2, 0)

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    this.renderer.setSize(host.clientWidth, host.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.outputToHost()

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.72, 0.65, 0.82)
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
    const hemi = new THREE.HemisphereLight(0x77cfff, 0x071017, 2.2)
    this.scene.add(hemi)

    const moon = new THREE.DirectionalLight(0x9edcff, 4.5)
    moon.position.set(-14, 22, 8)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    this.scene.add(moon)

    const warm = new THREE.PointLight(0xff9b59, 25, 52, 2)
    warm.position.set(14, 9, -12)
    this.scene.add(warm)
  }

  private setupEnvironment() {
    const land = new THREE.Mesh(
      new THREE.PlaneGeometry(72, 52, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x071d1c, roughness: 0.92, metalness: 0.05 }),
    )
    land.rotation.x = -Math.PI / 2
    land.position.set(-14, -1.3, 2)
    land.receiveShadow = true
    this.scene.add(land)

    const grid = new THREE.GridHelper(62, 31, 0x0c86b8, 0x063247)
    grid.position.set(-10, -1.25, 1)
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => {
      material.transparent = true
      material.opacity = 0.18
    })
    this.scene.add(grid)

    this.oceanMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(0x031b2b) },
        uShallow: { value: new THREE.Color(0x0b5d7d) },
      },
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float wave = sin((p.x + uTime * 1.8) * .55) * .16 + cos((p.y - uTime) * .72) * .10;
          p.z += wave;
          vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          float foam = smoothstep(.17, .25, vWave);
          vec3 color = mix(uDeep, uShallow, vUv.y * .65 + .18);
          color += foam * vec3(.22, .55, .72);
          gl_FragColor = vec4(color, .94);
        }
      `,
    })
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(48, 58, 92, 92), this.oceanMaterial)
    ocean.rotation.x = -Math.PI / 2
    ocean.position.set(26, -1.1, -2)
    this.scene.add(ocean)

    const starsGeometry = new THREE.BufferGeometry()
    const stars = new Float32Array(900)
    for (let i = 0; i < stars.length; i += 3) {
      stars[i] = (Math.random() - 0.5) * 100
      stars[i + 1] = Math.random() * 34 + 4
      stars[i + 2] = (Math.random() - 0.5) * 76
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    this.scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x79ccff, size: 0.07, transparent: true, opacity: 0.55 })))
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
    const training = await loadModelOrFallback('training-center', () => this.makeBuilding(0x0c5574))
    training.position.set(-9, 0, 3)
    this.addNode('training', training)

    const station = await loadModelOrFallback('ground-station', () => this.makeBuilding(0x17435a))
    station.position.set(2, 0, 4)
    station.scale.setScalar(0.78)
    this.addNode('groundStation', station)

    const uav = await loadModelOrFallback('uav', () => this.makeAircraft('uav'))
    uav.position.set(13, 8.2, 1)
    uav.scale.setScalar(0.75)
    this.addNode('uav', uav)

    const awacs = await loadModelOrFallback('awacs', () => this.makeAircraft('awacs'))
    awacs.position.set(1, 11.4, -8)
    awacs.scale.setScalar(0.78)
    this.addNode('awacs', awacs)

    const ship = await loadModelOrFallback('ship', () => this.makeShip())
    ship.position.set(18, 0.3, 10)
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

    this.createTargetBeam()
  }

  private addNode(key: string, object: THREE.Object3D) {
    object.userData.baseY = object.position.y
    this.nodes.set(key, object)
    this.scene.add(object)
  }

  private setupLinks() {
    this.createFlow('groundToTraining', [new THREE.Vector3(-20, 1.3, 4), new THREE.Vector3(-15, 2.8, 3.7), new THREE.Vector3(-9, 1.6, 3)], 0xff5e54)
    this.createFlow('trainingToUav', [new THREE.Vector3(-8, 2, 3), new THREE.Vector3(1, 8, -1), new THREE.Vector3(13, 8.4, 1)], 0x45c9ff)
    this.createFlow('trainingToAwacs', [new THREE.Vector3(-8, 2.2, 2), new THREE.Vector3(-3, 8.5, -4), new THREE.Vector3(1, 11.4, -8)], 0x45c9ff)
    this.createFlow('uavToAwacs', [new THREE.Vector3(13, 8.5, 1), new THREE.Vector3(8, 12.2, -4), new THREE.Vector3(1, 11.5, -8)], 0xffb13b)
    this.createFlow('airToAwacs', [new THREE.Vector3(20, 13, -13), new THREE.Vector3(10, 15.5, -12), new THREE.Vector3(1, 11.8, -8)], 0xff6d4f)
  }

  private createFlow(key: FlowKey, points: THREE.Vector3[], color: number) {
    const curve = new THREE.CatmullRomCurve3(points)
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80))
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08 })
    const line = new THREE.Line(geometry, material)
    this.scene.add(line)

    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(18 * 3)
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, opacity: 0 }))
    this.scene.add(particles)
    this.flows.set(key, { line, particles, curve })
  }

  private createTargetBeam() {
    const material = new THREE.MeshBasicMaterial({ color: 0x35c9ff, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })
    const beam = new THREE.Mesh(new THREE.ConeGeometry(4.1, 10, 32, 1, true), material)
    beam.position.set(13, 3, 4)
    beam.rotation.x = Math.PI
    beam.visible = false
    this.targetBeam = beam
    this.scene.add(beam)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.05, 48),
      new THREE.MeshBasicMaterial({ color: 0x48dfff, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    )
    ring.position.set(18, -0.55, 10)
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    this.targetRing = ring
    this.scene.add(ring)
  }

  setFlowState(key: FlowKey, state: 'hidden' | 'active' | 'locked') {
    const flow = this.flows.get(key)
    if (!flow) return
    const material = flow.line.material as THREE.LineBasicMaterial
    const particleMaterial = flow.particles.material as THREE.PointsMaterial
    if (state === 'hidden') {
      gsap.to(material, { opacity: 0.04, duration: 0.6 })
      gsap.to(particleMaterial, { opacity: 0, duration: 0.3 })
    } else if (state === 'locked') {
      gsap.to(material, { opacity: 0.55, duration: 0.55 })
      gsap.to(particleMaterial, { opacity: 0, duration: 0.35 })
    } else {
      gsap.to(material, { opacity: 0.86, duration: 0.4 })
      gsap.to(particleMaterial, { opacity: 1, duration: 0.4 })
    }
  }

  focusNode(key: string) {
    const node = this.nodes.get(key)
    if (!node) return
    const target = node.position.clone()
    gsap.to(this.camera.position, {
      x: target.x * 0.35,
      y: Math.max(10, target.y + 8),
      z: target.z + 25,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => this.camera.lookAt(target),
    })
  }

  resetCamera() {
    gsap.to(this.camera.position, { x: 0, y: 16, z: 34, duration: 1.45, ease: 'power2.inOut', onUpdate: () => this.camera.lookAt(0, 2, 0) })
  }

  showRecognition(active: boolean) {
    if (this.targetBeam) this.targetBeam.visible = active
    if (this.targetRing) this.targetRing.visible = active
  }

  pulseNode(key: string) {
    const node = this.nodes.get(key)
    if (!node) return
    const start = node.scale.clone()
    gsap.timeline().to(node.scale, { x: start.x * 1.08, y: start.y * 1.08, z: start.z * 1.08, duration: 0.24 }).to(node.scale, { x: start.x, y: start.y, z: start.z, duration: 0.55, ease: 'elastic.out(1,.55)' })
  }

  private updateParticles(elapsed: number) {
    for (const [index, flow] of [...this.flows.values()].entries()) {
      const material = flow.particles.material as THREE.PointsMaterial
      if (material.opacity < 0.02) continue
      const attribute = flow.particles.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < attribute.count; i += 1) {
        const t = (elapsed * (0.18 + index * 0.012) + i / attribute.count) % 1
        const point = flow.curve.getPoint(t)
        attribute.setXYZ(i, point.x, point.y, point.z)
      }
      attribute.needsUpdate = true
    }
  }

  private animate = () => {
    if (this.disposed) return
    this.animationFrame = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    if (this.oceanMaterial) this.oceanMaterial.uniforms.uTime.value = elapsed
    this.updateParticles(elapsed)

    const uav = this.nodes.get('uav')
    const awacs = this.nodes.get('awacs')
    if (uav) uav.position.y = Number(uav.userData.baseY) + Math.sin(elapsed * 0.72) * 0.16
    if (awacs) awacs.position.y = Number(awacs.userData.baseY) + Math.sin(elapsed * 0.55 + 1.2) * 0.13
    if (this.targetRing?.visible) this.targetRing.rotation.z = elapsed * 0.6

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

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
    this.host.replaceChildren()
  }
}
