<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ success: [] }>()
const username = ref('')
const password = ref('')
const remember = ref(false)
const error = ref('')

function login() {
  if (!username.value.trim() || !password.value.trim()) {
    error.value = '请输入账户和密码'
    return
  }
  error.value = ''
  emit('success')
}
</script>

<template>
  <main class="login-page">
    <div class="grid" />
    <section class="brand">
      <div class="eyebrow">INTELLIGENT SITUATION DISPLAY</div>
      <h1>智能攻击态势展示系统</h1>
      <p>数据驱动 · 模型赋能 · 协同感知</p>
    </section>

    <form class="login-card hud-panel" @submit.prevent="login">
      <h2>系统登录</h2>
      <label><span>账户</span><input v-model="username" autocomplete="username" placeholder="请输入账户" /></label>
      <label><span>密码</span><input v-model="password" autocomplete="current-password" type="password" placeholder="请输入密码" /></label>
      <label class="remember"><input v-model="remember" type="checkbox" /><span>记住密码</span></label>
      <div v-if="error" class="error">{{ error }}</div>
      <button type="submit">进入系统</button>
    </form>
  </main>
</template>

<style scoped>
.login-page { position: relative; display: grid; place-items: center; width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at 50% 38%, rgba(16,132,198,.25), transparent 35%), linear-gradient(180deg,#071b2f,#020812 72%); }
.grid { position:absolute; inset:0; opacity:.28; background-image:linear-gradient(rgba(50,174,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(50,174,255,.08) 1px,transparent 1px); background-size:58px 58px; mask-image:linear-gradient(to bottom,transparent,#000 25%,#000 75%,transparent); transform:perspective(700px) rotateX(65deg) translateY(35%); }
.brand { position:absolute; top:12%; text-align:center; }
.eyebrow { color:#5ecaff; font-size:12px; letter-spacing:.38em; }
h1 { margin:16px 0 8px; font-size:clamp(34px,3vw,58px); letter-spacing:.16em; text-shadow:0 0 24px rgba(65,195,255,.52); }
.brand p { color:#7fb5cf; letter-spacing:.4em; }
.login-card { position:relative; width:390px; margin-top:130px; padding:34px; }
h2 { margin:0 0 28px; font-size:22px; letter-spacing:.18em; }
label { display:block; margin-bottom:18px; }
label span { display:block; margin-bottom:8px; color:#86b8cf; font-size:13px; }
label input:not([type='checkbox']) { width:100%; height:46px; padding:0 14px; color:#eaffff; border:1px solid rgba(73,181,235,.34); outline:0; background:rgba(1,15,29,.84); }
.remember { display:flex; align-items:center; gap:9px; }
.remember span { margin:0; }
.error { margin:-6px 0 14px; color:#ff7474; font-size:13px; }
button { width:100%; height:48px; cursor:pointer; border:1px solid #48ceff; background:linear-gradient(90deg,rgba(5,102,157,.82),rgba(4,160,214,.68)); box-shadow:0 0 22px rgba(0,164,255,.22); font-weight:700; letter-spacing:.2em; }
</style>
