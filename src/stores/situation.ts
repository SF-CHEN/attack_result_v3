import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ValidationMode = 'ground' | 'air'
export type TaskStage = 'preprocess' | 'training' | 'mission-data' | 'executing' | 'finished' | 'emergency'

export interface SampleRecord {
  id: string
  method: string
  originalLabel: string
  changedLabel: string
  detected?: boolean
  result?: string
}

export const TASK_STAGES: Array<{ id: TaskStage; label: string }> = [
  { id: 'preprocess', label: '样本数据预处理' },
  { id: 'training', label: '智能模型训练' },
  { id: 'mission-data', label: '协同任务/航路数据装订' },
  { id: 'executing', label: '任务执行' },
  { id: 'finished', label: '任务结束' },
  { id: 'emergency', label: '应急失控' },
]

export const useSituationStore = defineStore('situation', () => {
  const mode = ref<ValidationMode>('ground')
  const groundStep = ref(0)
  const airStep = ref(0)
  const taskStage = ref<TaskStage>('preprocess')
  const training = ref(false)
  const pollutionDetecting = ref(false)
  const onboardDetecting = ref(false)
  const modelLabel = ref('')
  const uavAccuracy = ref<number | null>(null)
  const awacsAccuracy = ref<number | null>(null)
  const groundSamples = ref<Record<string, SampleRecord[]>>({})
  const airSamples = ref<Record<string, SampleRecord[]>>({})

  const activeStep = computed(() => (mode.value === 'ground' ? groundStep.value : airStep.value))

  function appendSample(target: ValidationMode, sample: SampleRecord) {
    const collection = target === 'ground' ? groundSamples.value : airSamples.value
    collection[sample.method] ??= []
    collection[sample.method].push(sample)
  }

  function setGroundStep(step: number) {
    mode.value = 'ground'
    groundStep.value = step
    if (step <= 2) taskStage.value = 'preprocess'
    else if (step <= 5) taskStage.value = 'training'
    else taskStage.value = 'executing'
    training.value = step === 4 || step === 9
    pollutionDetecting.value = step === 7
    modelLabel.value = step >= 10 ? '加固模型 / 原始模型' : step >= 5 ? 'gj 模型 / 原始模型' : ''
    if (step === 6 || step === 11) {
      uavAccuracy.value = step === 11 ? 96.8 : 84.2
      awacsAccuracy.value = step === 11 ? 97.4 : 86.7
    }
  }

  function setAirStep(step: number) {
    mode.value = 'air'
    airStep.value = step
    taskStage.value = 'executing'
    onboardDetecting.value = step === 6
    if (step === 1 || step === 5 || step === 8) {
      uavAccuracy.value = step === 8 ? 97.2 : step === 5 ? 78.6 : 94.8
      awacsAccuracy.value = step === 8 ? 96.5 : step === 5 ? 80.1 : 95.3
    }
  }

  function reset() {
    mode.value = 'ground'
    groundStep.value = 0
    airStep.value = 0
    taskStage.value = 'preprocess'
    training.value = false
    pollutionDetecting.value = false
    onboardDetecting.value = false
    modelLabel.value = ''
    uavAccuracy.value = null
    awacsAccuracy.value = null
    groundSamples.value = {}
    airSamples.value = {}
  }

  return { mode, groundStep, airStep, activeStep, taskStage, training, pollutionDetecting, onboardDetecting, modelLabel, uavAccuracy, awacsAccuracy, groundSamples, airSamples, setGroundStep, setAirStep, appendSample, reset }
})
