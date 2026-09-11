<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { AnimationDirector } from '@/scene/AnimationDirector'
import { SituationScene } from '@/scene/SituationScene'
import { TASK_STAGES, useSituationStore, type TaskStage } from '@/stores/situation'

const emit = defineEmits<{ home: [] }>()
const store = useSituationStore()
const sceneHost = ref<HTMLElement | null>(null)
const activePanel = ref<'ground' | 'awacsAccuracy' | 'awacs' | 'uavAccuracy' | 'uav' | 'history' | null>(null)

let scene: SituationScene | undefined
let director: AnimationDirector | undefined

const groundSteps = Array.from({ length: 11 }, (_, i) => i + 1)
const airSteps = Array.from({ length: 8 }, (_, i) => i + 1)

const currentCaption = computed(() => {
  if (store.mode === 'ground') {
    const captions: Record<number, string> = {
      1: '数据污染流程启动', 2: '污染样本持续到达', 3: '数据集上传完成', 4: '训练中心正在训练',
      5: '模型正在下发', 6: '协同识别与 qb 融合', 7: '正在进行数据污染检测', 8: '污染检测完成',
      9: '检测后数据再训练', 10: '加固模型正在下发', 11: '加固模型协同推理',
    }
    return captions[store.groundStep] ?? '等待地面验证流程'
  }
  const captions: Record<number, string> = {
    1: '原始样本协同推理', 2: '对抗样本流程启动', 3: '样本持续到达展示侧', 4: '样本链路保持',
    5: '对抗样本协同推理', 6: '机上设备正在检测', 7: '检测完成', 8: '过滤后样本重新推理',
  }
  return captions[store.airStep] ?? '等待空中验证流程'
})

const recognitionActive = computed(() =>
  (store.mode === 'ground' && [6, 11].includes(store.groundStep)) ||
  (store.mode === 'air' && [1, 5, 8].includes(store.airStep)),
)

const groundFlowActive = computed(() => store.mode === 'ground' && store.groundStep >= 1 && store.groundStep <= 3)
const airFlowActive = computed(() => store.mode === 'air' && store.airStep >= 2 && store.airStep <= 4)
const modelFlowActive = computed(() => store.mode === 'ground' && [5, 10].includes(store.groundStep))

function runGroundStep(step: number) {
  store.setGroundStep(step)
  if (step === 2 && Object.keys(store.groundSamples).length === 0) seedDemoSamples('ground')
  director?.playGround(step)
}

function runAirStep(step: number) {
  store.setAirStep(step)
  if (step === 3 && Object.keys(store.airSamples).length === 0) seedDemoSamples('air')
  director?.playAir(step)
}

function seedDemoSamples(target: 'ground' | 'air') {
  const methods = target === 'ground' ? ['方法 A', '方法 B', '方法 C'] : ['方法 D', '方法 E', '方法 F']
  methods.forEach((method, methodIndex) => {
    for (let i = 0; i < 4; i += 1) {
      store.appendSample(target, {
        id: `${target}-${methodIndex}-${Date.now()}-${i}`,
        method,
        originalLabel: '舰船',
        changedLabel: methodIndex % 2 === 0 ? '背景' : '其他目标',
        detected: i % 4 !== 0,
        result: i % 3 === 0 ? '识别偏移' : '识别正常',
      })
    }
  })
}

function resetAll() {
  store.reset()
  director?.reset()
  activePanel.value = null
}

function setStage(stage: TaskStage) {
  store.taskStage = stage
}

function formatAccuracy(value: number | null) {
  return value === null ? '暂无数据' : `${value.toFixed(1)}%`
}

function totalSamples(target: 'ground' | 'air') {
  const source = target === 'ground' ? store.groundSamples : store.airSamples
  return Object.values(source).reduce((sum, rows) => sum + rows.length, 0)
}

onMounted(async () => {
  await nextTick()
  if (!sceneHost.value) return
  scene = new SituationScene(sceneHost.value)
  director = new AnimationDirector(scene)
})

onBeforeUnmount(() => scene?.dispose())
</script>

<template>
  <main class="situation-page">
    <div ref="sceneHost" class="scene-host" />
    <div class="vignette" />
    <div class="scan-overlay" />

    <header class="top-shell">
      <button class="home-button" @click="emit('home')">⌂ <span>返回首页</span></button>
      <button class="system-title" @click="emit('home')">
        <b>智能攻击态势展示系统</b>
        <small>INTELLIGENT ATTACK SITUATION DISPLAY SYSTEM</small>
      </button>
      <div class="system-status"><i />系统运行中</div>
    </header>

    <section class="step-shell hud-panel">
      <div class="step-group">
        <span>地面验证步骤</span>
        <button v-for="step in groundSteps" :key="`g-${step}`" :class="{ active: store.mode === 'ground' && store.groundStep === step }" @click="runGroundStep(step)">{{ step }}</button>
      </div>
      <div class="divider" />
      <div class="step-group">
        <span>空中验证步骤</span>
        <button v-for="step in airSteps" :key="`a-${step}`" :class="{ active: store.mode === 'air' && store.airStep === step }" @click="runAirStep(step)">{{ step }}</button>
      </div>
      <button class="reset-button" @click="resetAll">重置</button>
    </section>

    <nav class="side-nav side-left">
      <button :class="{ active: activePanel === 'ground' }" @click="activePanel = activePanel === 'ground' ? null : 'ground'">◉<span>地面侧攻防<br />实时态势</span><em>›</em></button>
      <button :class="{ active: activePanel === 'awacsAccuracy' }" @click="activePanel = activePanel === 'awacsAccuracy' ? null : 'awacsAccuracy'">▥<span>预警机端模型<br />运行准确率</span><em>›</em></button>
      <button :class="{ active: activePanel === 'awacs' }" @click="activePanel = activePanel === 'awacs' ? null : 'awacs'">◈<span>预警机侧攻防<br />实时态势</span><em>›</em></button>
    </nav>

    <nav class="side-nav side-right">
      <button :class="{ active: activePanel === 'uavAccuracy' }" @click="activePanel = activePanel === 'uavAccuracy' ? null : 'uavAccuracy'">⌁<span>无人机端模型<br />运行准确率</span><em>‹</em></button>
      <button :class="{ active: activePanel === 'uav' }" @click="activePanel = activePanel === 'uav' ? null : 'uav'">◇<span>无人机侧攻防<br />实时态势</span><em>‹</em></button>
      <button :class="{ active: activePanel === 'history' }" @click="activePanel = activePanel === 'history' ? null : 'history'">▤<span>历史攻防数据</span><em>‹</em></button>
    </nav>

    <section class="scene-label training-label hud-panel">
      <b>训练中心</b>
      <span v-if="store.training" class="busy">正在训练</span>
      <span v-else>TRAINING CENTER</span>
    </section>
    <section class="scene-label source-label hud-panel"><b>地面攻击系统</b><span :class="{ danger: groundFlowActive }">GROUND SOURCE</span></section>
    <section class="scene-label detection-label hud-panel"><b>安全性检测评估系统</b><span :class="{ busy: store.pollutionDetecting }">{{ store.pollutionDetecting ? '正在进行数据污染检测' : 'DETECTION READY' }}</span></section>
    <section class="scene-label station-label hud-panel"><b>地面站</b><span>GROUND STATION</span></section>
    <section class="scene-label security-label hud-panel"><b>机上安全保密设备</b><span :class="{ busy: store.onboardDetecting }">{{ store.onboardDetecting ? '正在进行对抗样本检测' : 'SECURITY DEVICE' }}</span></section>
    <section class="scene-label awacs-label hud-panel"><b>预警机</b><span>{{ recognitionActive ? 'qb 融合' : 'AWACS' }}</span></section>
    <section class="scene-label uav-label hud-panel"><b>无人机</b><span>{{ recognitionActive ? '目标识别' : 'UAV' }}</span></section>
    <section class="scene-label air-source-label hud-panel"><b>空中攻击方</b><span :class="{ danger: airFlowActive }">AIR SOURCE</span></section>

    <div v-if="groundFlowActive" class="flow-caption ground-caption danger-text">数据污染 · SAMPLE FLOW</div>
    <div v-if="modelFlowActive" class="flow-caption model-caption">模型下发 · {{ store.modelLabel }}</div>
    <div v-if="recognitionActive" class="flow-caption return-caption warning-text">有目标数据回传</div>
    <div v-if="airFlowActive" class="flow-caption air-caption danger-text">对抗样本流程</div>

    <section v-if="recognitionActive" class="result-card awacs-result hud-panel">
      <header>预警机目标检测结果 <i>LIVE</i></header>
      <div class="preview target-preview"><span class="target-box" /></div>
      <dl><dt>目标类型</dt><dd>舰船</dd><dt>检测数量</dt><dd>1</dd><dt>置信度</dt><dd>0.947</dd><dt>融合状态</dt><dd class="ok">qb 融合完成</dd></dl>
    </section>

    <section v-if="recognitionActive" class="result-card uav-result hud-panel">
      <header>无人机图像分类结果 <i>LIVE</i></header>
      <div class="preview ship-preview" />
      <dl><dt>目标类型</dt><dd>舰船</dd><dt>置信度</dt><dd>0.932</dd><dt>运行准确率</dt><dd class="ok">{{ formatAccuracy(store.uavAccuracy) }}</dd></dl>
    </section>

    <section v-if="activePanel" class="drawer hud-panel" :class="activePanel.startsWith('uav') || activePanel === 'history' ? 'drawer-right' : 'drawer-left'">
      <button class="drawer-close" @click="activePanel = null">×</button>
      <template v-if="activePanel === 'ground' || activePanel === 'uav' || activePanel === 'awacs'">
        <div class="drawer-eyebrow">REALTIME SAMPLE STATUS</div>
        <h2>{{ activePanel === 'ground' ? '地面侧攻防实时态势' : activePanel === 'uav' ? '无人机侧攻防实时态势' : '预警机侧攻防实时态势' }}</h2>
        <div class="stat-row"><div><small>当前模式</small><b>{{ store.mode === 'ground' ? '地面验证' : '空中验证' }}</b></div><div><small>样本总量</small><b>{{ totalSamples(store.mode) }}</b></div><div><small>当前步骤</small><b>{{ store.activeStep || '-' }}</b></div></div>
        <div class="method-list">
          <article v-for="(rows, method) in store.mode === 'ground' ? store.groundSamples : store.airSamples" :key="method">
            <div><b>{{ method }}</b><small>{{ rows.length }} 张样本</small></div>
            <strong>{{ rows.filter((row) => row.detected).length }}</strong>
          </article>
          <div v-if="totalSamples(store.mode) === 0" class="empty">暂无样本数据，请先运行对应模拟步骤</div>
        </div>
      </template>
      <template v-else-if="activePanel === 'awacsAccuracy' || activePanel === 'uavAccuracy'">
        <div class="drawer-eyebrow">MODEL ACCURACY</div>
        <h2>{{ activePanel === 'awacsAccuracy' ? '预警机端模型运行准确率' : '无人机端模型运行准确率' }}</h2>
        <div class="accuracy-value">{{ formatAccuracy(activePanel === 'awacsAccuracy' ? store.awacsAccuracy : store.uavAccuracy) }}</div>
        <div class="accuracy-bar"><i :style="{ width: `${activePanel === 'awacsAccuracy' ? store.awacsAccuracy ?? 0 : store.uavAccuracy ?? 0}%` }" /></div>
        <p>准确率由流程消息持续更新；未运行推理阶段时保持“暂无数据”。</p>
      </template>
      <template v-else>
        <div class="drawer-eyebrow">MISSION HISTORY</div><h2>历史攻防数据</h2>
        <table><thead><tr><th>时间</th><th>主体</th><th>客体</th><th>事件</th><th>类型</th><th>次数</th></tr></thead><tbody><tr><td>14:21:08</td><td>训练中心</td><td>无人机</td><td>模型下发</td><td>地面</td><td>1</td></tr><tr><td>14:22:31</td><td>无人机</td><td>预警机</td><td>目标数据回传</td><td>协同</td><td>8</td></tr><tr><td>14:24:12</td><td>检测设备</td><td>样本集</td><td>检测完成</td><td>防御</td><td>100</td></tr></tbody></table>
      </template>
    </section>

    <section class="current-status hud-panel"><span>当前演示</span><b>{{ currentCaption }}</b><em>STEP {{ store.activeStep || '--' }}</em></section>

    <footer class="stage-bar">
      <button v-for="(stage, index) in TASK_STAGES" :key="stage.id" :class="{ active: store.taskStage === stage.id, running: (store.training && stage.id === 'training') || ((groundFlowActive || airFlowActive) && (stage.id === 'preprocess' || stage.id === 'executing')) }" @click="setStage(stage.id)">
        <i>{{ store.taskStage === stage.id ? '●' : index + 1 }}</i><span>{{ stage.label }}</span>
      </button>
    </footer>
  </main>
</template>

<style scoped>
.situation-page { position:relative; width:100%; height:100%; overflow:hidden; background:#020812; }
.scene-host { position:absolute; inset:0; }
:deep(.three-canvas) { width:100%!important; height:100%!important; display:block; }
.vignette { position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 52% 44%,transparent 28%,rgba(0,5,13,.2) 67%,rgba(0,3,9,.72) 100%); }
.scan-overlay { position:absolute; inset:0; pointer-events:none; opacity:.2; background:repeating-linear-gradient(to bottom,transparent 0,transparent 3px,rgba(90,208,255,.04) 4px); }
.scan-overlay::after { content:''; position:absolute; left:0; right:0; height:180px; background:linear-gradient(transparent,rgba(76,209,255,.035),transparent); animation:scanLine 10s linear infinite; }
.top-shell { position:absolute; z-index:10; top:0; left:0; right:0; height:70px; display:grid; grid-template-columns:260px 1fr 260px; align-items:center; padding:0 24px; border-bottom:1px solid rgba(66,193,255,.33); background:linear-gradient(180deg,rgba(2,14,29,.96),rgba(2,15,29,.72)); box-shadow:0 15px 35px rgba(0,0,0,.2); }
.home-button,.system-title { border:0; background:transparent; cursor:pointer; }
.home-button { justify-self:start; color:#90dfff; letter-spacing:.12em; }
.system-title { display:flex; flex-direction:column; align-items:center; }
.system-title b { font-size:30px; letter-spacing:.22em; text-shadow:0 0 18px rgba(48,196,255,.65); }
.system-title small { margin-top:4px; color:#4d9ebe; font-size:8px; letter-spacing:.45em; }
.system-status { justify-self:end; color:#68f1b3; font-size:12px; letter-spacing:.12em; }
.system-status i { display:inline-block; width:8px; height:8px; margin-right:8px; border-radius:50%; background:#5affe0; box-shadow:0 0 14px #4fffcc; }
.step-shell { position:absolute; z-index:12; top:78px; left:50%; display:flex; align-items:center; gap:14px; height:43px; padding:0 13px; transform:translateX(-50%); }
.step-group { display:flex; align-items:center; gap:6px; }
.step-group span { margin-right:5px; color:#72c8ef; font-size:12px; letter-spacing:.1em; }
.step-group button,.reset-button { width:28px; height:27px; cursor:pointer; border:1px solid rgba(80,186,235,.44); border-radius:2px; background:rgba(3,28,47,.82); color:#8dcee9; font-size:12px; }
.step-group button.active { color:#fff; border-color:#74e7ff; background:linear-gradient(180deg,rgba(19,146,207,.72),rgba(4,56,91,.76)); box-shadow:0 0 16px rgba(53,204,255,.45),inset 0 0 9px rgba(88,222,255,.25); }
.divider { width:1px; height:25px; background:rgba(84,189,235,.28); }
.reset-button { width:auto; padding:0 12px; }
.side-nav { position:absolute; z-index:14; top:165px; display:flex; flex-direction:column; gap:10px; }
.side-left { left:10px; }.side-right { right:10px; }
.side-nav button { width:112px; min-height:92px; display:grid; grid-template-columns:24px 1fr 10px; align-items:center; gap:5px; cursor:pointer; border:1px solid rgba(47,181,241,.46); background:linear-gradient(90deg,rgba(3,29,51,.9),rgba(3,21,39,.72)); box-shadow:inset 0 0 18px rgba(30,143,214,.07),0 0 18px rgba(0,103,190,.05); color:#c7efff; }
.side-right button { grid-template-columns:10px 1fr 24px; }
.side-nav button:hover,.side-nav button.active { border-color:#66dfff; box-shadow:0 0 20px rgba(46,202,255,.18),inset 0 0 18px rgba(52,194,255,.12); }
.side-nav button > span { font-size:12px; line-height:1.7; letter-spacing:.05em; }
.side-nav em { color:#56dfff; font-size:20px; font-style:normal; }
.scene-label { position:absolute; z-index:5; display:flex; flex-direction:column; gap:2px; padding:6px 10px; pointer-events:none; transform:translate(-50%,-50%); }
.scene-label b { font-size:12px; letter-spacing:.08em; }.scene-label span { color:#6aafca; font-size:8px; letter-spacing:.12em; }
.scene-label .busy { color:#64ffd0; text-shadow:0 0 10px #20d6a1; animation:breathe 1.1s ease-in-out infinite; }.scene-label .danger { color:#ff7668; }
.training-label { left:34%; top:57%; }.source-label { left:20%; top:61%; }.detection-label { left:26%; top:77%; }.station-label { left:52%; top:62%; }.security-label { left:58%; top:77%; }.awacs-label { left:51%; top:30%; }.uav-label { left:70%; top:42%; }.air-source-label { left:82%; top:23%; }
.flow-caption { position:absolute; z-index:7; padding:4px 10px; border-radius:2px; background:rgba(1,13,25,.74); font-size:11px; font-weight:700; letter-spacing:.1em; text-shadow:0 0 10px currentColor; }
.ground-caption { left:24%; top:55%; transform:rotate(-7deg); }.model-caption { left:43%; top:42%; color:#64d8ff; }.return-caption { left:62%; top:33%; }.air-caption { right:21%; top:28%; }.danger-text { color:#ff6c62; }.warning-text { color:#ffbe43; }
.result-card { position:absolute; z-index:8; width:270px; padding:10px; }
.awacs-result { left:56%; top:19%; }.uav-result { right:9%; top:33%; }
.result-card header { display:flex; justify-content:space-between; padding-bottom:7px; border-bottom:1px solid rgba(82,197,244,.22); font-size:12px; font-weight:700; letter-spacing:.08em; }
.result-card header i { color:#67ffd0; font-size:9px; font-style:normal; }.preview { float:left; width:102px; height:73px; margin:9px 11px 3px 0; border:1px solid rgba(91,202,247,.3); background:radial-gradient(circle at 60% 55%,#607b87 0 7%,transparent 8%),linear-gradient(165deg,#335467,#0a2635 55%,#061621 56%); position:relative; overflow:hidden; }
.target-box { position:absolute; left:45px; top:27px; width:36px; height:22px; border:1px solid #ff5b5b; box-shadow:0 0 7px #ff4b4b; }
.ship-preview::after { content:''; position:absolute; left:26px; top:35px; width:54px; height:12px; background:#8aa2ad; clip-path:polygon(0 55%,76% 50%,100% 70%,84% 100%,14% 100%); }
dl { margin:8px 0 0; display:grid; grid-template-columns:1fr 1fr; gap:5px 7px; font-size:9px; }dt { color:#6fa9c1; }dd { margin:0; color:#d9f6ff; }.ok { color:#5ff1af; }
.drawer { position:absolute; z-index:30; top:132px; bottom:104px; width:420px; padding:24px; animation:drawerIn .32s ease-out both; }
.drawer-left { left:130px; }.drawer-right { right:130px; }.drawer-close { position:absolute; top:12px; right:13px; width:30px; height:30px; border:0; background:transparent; color:#7edcff; cursor:pointer; font-size:24px; }
.drawer-eyebrow { color:#4da8cc; font-size:9px; letter-spacing:.32em; }.drawer h2 { margin:8px 0 22px; font-size:20px; letter-spacing:.12em; }
.stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.stat-row div { padding:12px; border:1px solid rgba(74,174,218,.2); background:rgba(6,39,59,.4); }.stat-row small { display:block; color:#669bb1; font-size:9px; }.stat-row b { display:block; margin-top:6px; font-size:16px; }
.method-list { margin-top:16px; }.method-list article { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; margin-bottom:7px; border-left:2px solid #38bfe9; background:rgba(6,35,53,.6); }.method-list article small { display:block; margin-top:4px; color:#6598ad; }.method-list article strong { color:#62e7ff; font-size:21px; }.empty { padding:28px 12px; color:#60899c; text-align:center; }
.accuracy-value { margin:38px 0 14px; color:#79f7ff; font-size:52px; font-weight:700; letter-spacing:.06em; text-shadow:0 0 18px rgba(55,216,255,.35); }.accuracy-bar { height:7px; background:rgba(63,150,185,.18); overflow:hidden; }.accuracy-bar i { display:block; height:100%; background:linear-gradient(90deg,#278bd1,#68f4d0); box-shadow:0 0 12px #46daff; }.drawer p { color:#6e9caf; font-size:12px; line-height:1.8; }
table { width:100%; border-collapse:collapse; font-size:11px; }th,td { padding:11px 7px; border-bottom:1px solid rgba(72,169,211,.18); text-align:left; }th { color:#63b5d6; font-weight:500; }td { color:#bddcea; }
.current-status { position:absolute; z-index:8; left:50%; bottom:92px; display:flex; align-items:center; gap:13px; min-width:380px; padding:8px 15px; transform:translateX(-50%); }.current-status span { color:#568ea8; font-size:9px; }.current-status b { flex:1; font-size:12px; letter-spacing:.08em; }.current-status em { color:#58dfff; font-size:9px; font-style:normal; }
.stage-bar { position:absolute; z-index:20; left:0; right:0; bottom:0; display:grid; grid-template-columns:repeat(6,1fr); height:82px; padding:0 26px; border-top:1px solid rgba(65,186,239,.35); background:linear-gradient(180deg,rgba(2,21,37,.82),rgba(1,10,21,.98)); box-shadow:0 -15px 32px rgba(0,0,0,.22); }
.stage-bar button { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; border:0; background:transparent; color:#7198aa; }
.stage-bar button::before { content:''; position:absolute; top:23px; left:-50%; width:100%; height:1px; background:rgba(74,181,225,.22); }.stage-bar button:first-child::before { display:none; }
.stage-bar i { position:relative; z-index:2; display:grid; place-items:center; width:27px; height:27px; border:1px solid #47788d; border-radius:50%; background:#061827; color:#6e9cae; font-size:10px; font-style:normal; }.stage-bar span { font-size:11px; letter-spacing:.06em; }.stage-bar button.active { color:#ecfbff; }.stage-bar button.active i { border-color:#6eeeff; color:#fff; background:#0b6f9a; box-shadow:0 0 20px rgba(75,222,255,.75); }.stage-bar button.running i { animation:breathe .9s ease-in-out infinite; }
@keyframes drawerIn { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:none; } }
</style>
