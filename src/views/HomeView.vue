<script setup lang="ts">
const emit = defineEmits<{ 'enter-situation': [] }>()
</script>

<template>
  <main class="home-page">
    <header>
      <div>
        <div class="eyebrow">INTELLIGENT SITUATION DISPLAY</div>
        <h1>智能攻击态势展示系统</h1>
      </div>
      <div class="status"><i /> 系统运行中</div>
    </header>

    <section class="map-stage">
      <div class="halo halo-a" />
      <div class="halo halo-b" />
      <svg class="china-map" viewBox="0 0 900 650" aria-label="中国地图示意">
        <defs>
          <linearGradient id="mapFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0a4165" />
            <stop offset="1" stop-color="#062239" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path class="land" d="M123 198 184 145 251 137 307 102 364 127 423 115 479 145 543 147 589 180 648 188 696 229 760 245 774 300 744 337 703 344 680 391 631 408 607 461 558 476 524 521 459 515 427 548 374 517 330 535 292 488 238 481 221 432 179 407 158 358 112 336 97 282Z" fill="url(#mapFill)" stroke="#26bfff" stroke-width="3" filter="url(#glow)" />
        <path class="grid-line" d="M160 250 C330 210 515 225 720 282" />
        <path class="grid-line" d="M190 360 C360 315 525 330 680 390" />
        <circle cx="603" cy="356" r="9" class="location-dot" />
        <circle cx="603" cy="356" r="32" class="location-ring" />
      </svg>
      <button class="location-card hud-panel" @click="emit('enter-situation')">
        <span class="pin" />
        <span><b>东部沿海联合验证区域</b><small>点击进入实时态势</small></span>
        <em>›</em>
      </button>
    </section>

    <footer>GLOBAL OVERVIEW · SECURE VISUALIZATION · REALTIME SITUATION</footer>
  </main>
</template>

<style scoped>
.home-page { position:relative; width:100%; height:100%; overflow:hidden; background:radial-gradient(circle at 50% 42%,rgba(0,118,190,.15),transparent 32%),linear-gradient(180deg,#061a2c,#020913 75%); }
.home-page::before { content:''; position:absolute; inset:0; background-image:linear-gradient(rgba(47,168,232,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(47,168,232,.05) 1px,transparent 1px); background-size:54px 54px; mask-image:radial-gradient(circle at center,#000,transparent 72%); }
header { position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; height:92px; padding:0 52px; border-bottom:1px solid rgba(64,190,255,.18); background:linear-gradient(180deg,rgba(4,20,36,.88),rgba(3,14,28,.4)); }
.eyebrow { color:#54cfff; font-size:10px; letter-spacing:.32em; }
h1 { margin:8px 0 0; font-size:28px; letter-spacing:.18em; text-shadow:0 0 18px rgba(49,195,255,.45); }
.status { color:#77f6bf; font-size:13px; letter-spacing:.12em; }
.status i { display:inline-block; width:8px; height:8px; margin-right:8px; border-radius:50%; background:#57ffb2; box-shadow:0 0 14px #57ffb2; }
.map-stage { position:relative; width:min(1080px,78vw); height:calc(100% - 150px); margin:auto; display:grid; place-items:center; }
.china-map { width:min(850px,64vw); filter:drop-shadow(0 25px 55px rgba(0,0,0,.38)); }
.land { opacity:.96; }
.grid-line { fill:none; stroke:rgba(66,190,246,.18); stroke-width:2; stroke-dasharray:8 12; }
.location-dot { fill:#72efff; filter:url(#glow); }
.location-ring { fill:none; stroke:#47d8ff; stroke-width:2; transform-origin:603px 356px; animation:pulseRing 2.2s ease-out infinite; }
.halo { position:absolute; border:1px solid rgba(56,189,255,.11); border-radius:50%; }
.halo-a { width:680px; height:220px; transform:rotate(-6deg); }
.halo-b { width:860px; height:320px; transform:rotate(7deg); }
.location-card { position:absolute; left:62%; top:58%; display:flex; align-items:center; gap:14px; min-width:280px; padding:13px 16px; cursor:pointer; color:#dff7ff; text-align:left; border-radius:3px; }
.location-card:hover { border-color:#6ce6ff; box-shadow:0 0 28px rgba(40,189,255,.18); }
.location-card span { display:flex; flex-direction:column; gap:4px; }
.location-card small { color:#70a9c1; }
.location-card em { margin-left:auto; color:#6eeaff; font-size:28px; font-style:normal; }
.pin { width:12px; height:12px; border-radius:50%; background:#61e9ff; box-shadow:0 0 16px #4ddcff; }
footer { position:absolute; bottom:24px; width:100%; color:rgba(111,188,225,.52); text-align:center; font-size:10px; letter-spacing:.42em; }
</style>
