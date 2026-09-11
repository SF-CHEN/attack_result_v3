import { gsap } from 'gsap'

import type { SituationScene } from './SituationScene'

/**
 * The director owns timing and camera language. Business state only tells it
 * which step to play; visual details stay here so we can tune pacing without
 * touching WebSocket/event code later.
 */
export class AnimationDirector {
  private readonly scene: SituationScene
  private timeline?: gsap.core.Timeline
  private delayed?: gsap.core.Tween

  constructor(scene: SituationScene) {
    this.scene = scene
  }

  private begin() {
    this.timeline?.kill()
    this.delayed?.kill()
    this.timeline = gsap.timeline()
    return this.timeline
  }

  private clearTransientSignals() {
    this.scene.setNodeSignal('groundSource', false)
    this.scene.setNodeSignal('training', false)
    this.scene.setNodeSignal('uav', false)
    this.scene.setNodeSignal('awacs', false)
    this.scene.setNodeSignal('detection', false)
    this.scene.setNodeSignal('security', false)
    this.scene.setNodeSignal('airSource', false)
  }

  playGround(step: number) {
    const tl = this.begin()
    this.clearTransientSignals()

    if (step !== 6 && step !== 11) {
      this.scene.showRecognition(false)
      this.scene.setFusion(false)
      this.scene.setFlowState('uavToAwacs', 'hidden')
    }

    if (step !== 4 && step !== 5 && step !== 9 && step !== 10) {
      this.scene.setTrainingEnergy(false)
    }

    if (step === 1) {
      this.scene.setFlowState('trainingToUav', 'hidden')
      this.scene.setFlowState('trainingToAwacs', 'hidden')
      this.scene.cameraShot('groundAttack', 1.45)
      this.scene.setNodeSignal('groundSource', true, 'danger')

      tl.call(() => this.scene.pulseNode('groundSource', 0xff514c), [], 0.2)
        .call(() => this.scene.shakeCamera(0.08, 0.55), [], 0.38)
        .call(() => this.scene.setFlowState('groundToTraining', 'active'), [], 0.62)
        .call(() => this.scene.burstNode('groundSource', 0xff514c), [], 0.72)
        .call(() => this.scene.cameraShot('training', 1.8), [], 1.8)
        .call(() => this.scene.pulseNode('training', 0xff736b), [], 2.55)
      return
    }

    if (step === 2) {
      this.scene.setFlowState('groundToTraining', 'active')
      this.scene.setNodeSignal('groundSource', true, 'danger')
      this.scene.setNodeSignal('training', true, 'warning')
      this.scene.cameraShot('groundAttack', 1.1)
      tl.call(() => this.scene.burstNode('groundSource', 0xff514c), [], 0.2)
        .call(() => this.scene.burstNode('training', 0xff9b63), [], 0.8)
      return
    }

    if (step === 3) {
      this.scene.setFlowState('groundToTraining', 'locked')
      this.scene.setNodeSignal('training', true, 'info')
      this.scene.cameraShot('training', 1.35)
      tl.call(() => this.scene.pulseNode('training'), [], 0.45)
      return
    }

    if (step === 4 || step === 9) {
      const hardened = step === 9
      this.scene.setFlowState('groundToTraining', 'locked')
      this.scene.setNodeSignal('training', true, hardened ? 'success' : 'info')
      this.scene.cameraShot('training', 1.35)

      tl.call(() => this.scene.pulseNode('training', hardened ? 0x57ffb8 : 0x46d7ff), [], 0.25)
        .call(() => this.scene.setTrainingEnergy(true, hardened), [], 0.52)
        .call(() => this.scene.shakeCamera(0.055, 0.55), [], 0.72)
        .call(() => this.scene.burstNode('training', hardened ? 0x57ffb8 : 0x46d7ff), [], 1.15)
        .call(() => this.scene.cameraShot('overview', 1.8), [], 2.4)
      return
    }

    if (step === 5 || step === 10) {
      const hardened = step === 10
      const tone = hardened ? 'success' : 'info'
      const color = hardened ? 0x58ffb8 : 0x45d7ff
      this.scene.setNodeSignal('training', true, tone)
      this.scene.setTrainingEnergy(true, hardened)
      this.scene.cameraShot('training', 1.15)

      tl.call(() => this.scene.pulseNode('training', color), [], 0.18)
        .call(() => this.scene.burstNode('training', color), [], 0.48)
        .call(() => this.scene.shakeCamera(0.075, 0.62), [], 0.55)
        .call(() => this.scene.setFlowState('trainingToUav', 'active'), [], 0.82)
        .call(() => this.scene.setFlowState('trainingToAwacs', 'active'), [], 1.08)
        .call(() => this.scene.cameraShot('dispatch', 1.7), [], 1.02)
        .call(() => this.scene.setNodeSignal('uav', true, tone), [], 1.65)
        .call(() => this.scene.setNodeSignal('awacs', true, tone), [], 1.82)
        .call(() => this.scene.pulseNode('uav', color), [], 2.05)
        .call(() => this.scene.pulseNode('awacs', color), [], 2.25)
        .call(() => this.scene.setTrainingEnergy(false), [], 3.6)

      this.delayed = gsap.delayedCall(30, () => {
        this.scene.setFlowState('trainingToUav', 'hidden')
        this.scene.setFlowState('trainingToAwacs', 'hidden')
        this.scene.setNodeSignal('uav', false)
        this.scene.setNodeSignal('awacs', false)
      })
      return
    }

    if (step === 6 || step === 11) {
      const hardened = step === 11
      const color = hardened ? 0x59ffba : 0x42dcff
      this.scene.setFlowState('trainingToUav', 'hidden')
      this.scene.setFlowState('trainingToAwacs', 'hidden')
      this.scene.setNodeSignal('uav', true, hardened ? 'success' : 'info')
      this.scene.cameraShot('recognition', 1.35)

      tl.call(() => this.scene.showRecognition(true), [], 0.35)
        .call(() => this.scene.pulseNode('uav', color), [], 0.48)
        .call(() => this.scene.shakeCamera(0.04, 0.5), [], 0.72)
        .call(() => this.scene.setFlowState('uavToAwacs', 'active'), [], 1.28)
        .call(() => this.scene.setNodeSignal('awacs', true, 'warning'), [], 1.58)
        .call(() => this.scene.cameraShot('fusion', 1.65), [], 1.62)
        .call(() => this.scene.setFusion(true), [], 2.18)
        .call(() => this.scene.pulseNode('awacs', 0xffbd43), [], 2.38)
        .call(() => this.scene.cameraShot('recognition', 1.8), [], 4.1)
      return
    }

    if (step === 7) {
      this.scene.setNodeSignal('detection', true, 'success')
      this.scene.cameraShot('detection', 1.35)
      tl.call(() => this.scene.pulseNode('detection', 0x4affad), [], 0.28)
        .call(() => this.scene.burstNode('detection', 0x4affad), [], 0.85)
      return
    }

    if (step === 8) {
      this.scene.setNodeSignal('detection', true, 'success')
      this.scene.cameraShot('detection', 1.25)
      tl.call(() => this.scene.pulseNode('detection', 0x4affad), [], 0.2)
        .call(() => this.scene.burstNode('detection', 0x4affad), [], 0.45)
        .call(() => this.scene.burstNode('detection', 0x4affad), [], 0.95)
        .call(() => this.scene.cameraShot('overview', 1.7), [], 2.2)
    }
  }

  playAir(step: number) {
    const tl = this.begin()
    this.clearTransientSignals()
    this.scene.setTrainingEnergy(false)

    if (![1, 5, 8].includes(step)) {
      this.scene.showRecognition(false)
      this.scene.setFusion(false)
      this.scene.setFlowState('uavToAwacs', 'hidden')
    }

    if (![2, 3, 4].includes(step)) this.scene.setFlowState('airToAwacs', 'hidden')

    if (step === 1 || step === 5 || step === 8) {
      this.scene.setNodeSignal('uav', true, step === 8 ? 'success' : 'info')
      this.scene.cameraShot('recognition', 1.3)
      tl.call(() => this.scene.showRecognition(true), [], 0.28)
        .call(() => this.scene.pulseNode('uav', step === 8 ? 0x59ffba : 0x43dcff), [], 0.42)
        .call(() => this.scene.setFlowState('uavToAwacs', 'active'), [], 1.15)
        .call(() => this.scene.setNodeSignal('awacs', true, 'warning'), [], 1.45)
        .call(() => this.scene.cameraShot('fusion', 1.6), [], 1.5)
        .call(() => this.scene.setFusion(true), [], 2.05)
        .call(() => this.scene.pulseNode('awacs', 0xffbc42), [], 2.22)
        .call(() => this.scene.cameraShot('recognition', 1.7), [], 3.9)
      return
    }

    if (step === 2 || step === 3) {
      this.scene.setNodeSignal('airSource', true, 'danger')
      this.scene.setNodeSignal('awacs', true, 'warning')
      this.scene.cameraShot('airAttack', 1.3)
      tl.call(() => this.scene.pulseNode('airSource', 0xff534b), [], 0.22)
        .call(() => this.scene.shakeCamera(0.075, 0.58), [], 0.45)
        .call(() => this.scene.setFlowState('airToAwacs', 'active'), [], 0.68)
        .call(() => this.scene.burstNode('airSource', 0xff534b), [], 0.78)
        .call(() => this.scene.cameraShot('fusion', 1.7), [], 1.85)
      return
    }

    if (step === 4) {
      this.scene.setFlowState('airToAwacs', 'locked')
      this.scene.setNodeSignal('awacs', true, 'danger')
      this.scene.cameraShot('fusion', 1.35)
      tl.call(() => this.scene.pulseNode('awacs', 0xff665c), [], 0.4)
      return
    }

    if (step === 6) {
      this.scene.setNodeSignal('security', true, 'warning')
      this.scene.cameraShot('security', 1.35)
      tl.call(() => this.scene.pulseNode('security', 0xffc04d), [], 0.28)
        .call(() => this.scene.burstNode('security', 0xffc04d), [], 0.95)
      return
    }

    if (step === 7) {
      this.scene.setNodeSignal('security', true, 'success')
      this.scene.cameraShot('security', 1.25)
      tl.call(() => this.scene.pulseNode('security', 0x54ffb8), [], 0.18)
        .call(() => this.scene.burstNode('security', 0x54ffb8), [], 0.45)
        .call(() => this.scene.burstNode('security', 0x54ffb8), [], 1.0)
        .call(() => this.scene.cameraShot('overview', 1.7), [], 2.15)
    }
  }

  reset() {
    this.timeline?.kill()
    this.delayed?.kill()
    this.clearTransientSignals()
    this.scene.resetEffects()
    this.scene.resetCamera()
  }
}
