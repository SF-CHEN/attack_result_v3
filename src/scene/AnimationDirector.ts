import { gsap } from 'gsap'

import type { SituationScene } from './SituationScene'

export class AnimationDirector {
  private readonly scene: SituationScene
  private delayed?: gsap.core.Tween

  constructor(scene: SituationScene) {
    this.scene = scene
  }

  playGround(step: number) {
    this.delayed?.kill()
    this.scene.resetCamera()

    if (step === 1) {
      this.scene.setFlowState('groundToTraining', 'active')
      this.scene.focusNode('groundSource')
      this.scene.pulseNode('groundSource')
      return
    }

    if (step === 2) {
      this.scene.setFlowState('groundToTraining', 'active')
      this.scene.focusNode('training')
      return
    }

    if (step === 3) {
      this.scene.setFlowState('groundToTraining', 'locked')
      this.scene.focusNode('training')
      return
    }

    if (step === 4 || step === 9) {
      this.scene.setFlowState('groundToTraining', 'locked')
      this.scene.focusNode('training')
      this.scene.pulseNode('training')
      return
    }

    if (step === 5 || step === 10) {
      this.scene.setFlowState('trainingToUav', 'active')
      this.scene.setFlowState('trainingToAwacs', 'active')
      this.scene.focusNode('training')
      this.scene.pulseNode('training')
      this.delayed = gsap.delayedCall(30, () => {
        this.scene.setFlowState('trainingToUav', 'hidden')
        this.scene.setFlowState('trainingToAwacs', 'hidden')
      })
      return
    }

    if (step === 6 || step === 11) {
      this.scene.showRecognition(true)
      this.scene.setFlowState('uavToAwacs', 'active')
      this.scene.focusNode('uav')
      this.scene.pulseNode('uav')
      this.scene.pulseNode('awacs')
      return
    }

    if (step === 7 || step === 8) {
      this.scene.focusNode('detection')
      this.scene.pulseNode('detection')
    }
  }

  playAir(step: number) {
    this.delayed?.kill()
    this.scene.resetCamera()

    if (step === 1 || step === 5 || step === 8) {
      this.scene.showRecognition(true)
      this.scene.setFlowState('uavToAwacs', 'active')
      this.scene.focusNode('uav')
      return
    }

    if (step === 2 || step === 3) {
      this.scene.setFlowState('airToAwacs', 'active')
      this.scene.focusNode('airSource')
      this.scene.pulseNode('airSource')
      return
    }

    if (step === 4) {
      this.scene.setFlowState('airToAwacs', 'locked')
      this.scene.focusNode('awacs')
      return
    }

    if (step === 6 || step === 7) {
      this.scene.focusNode('security')
      this.scene.pulseNode('security')
    }
  }

  reset() {
    this.delayed?.kill()
    this.scene.showRecognition(false)
    this.scene.setFlowState('groundToTraining', 'hidden')
    this.scene.setFlowState('trainingToUav', 'hidden')
    this.scene.setFlowState('trainingToAwacs', 'hidden')
    this.scene.setFlowState('uavToAwacs', 'hidden')
    this.scene.setFlowState('airToAwacs', 'hidden')
    this.scene.resetCamera()
  }
}
