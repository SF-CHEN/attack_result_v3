<script setup lang="ts">
import { ref } from 'vue'

import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import SituationView from '@/views/SituationView.vue'

type AppPage = 'login' | 'home' | 'situation'

const page = ref<AppPage>('login')
</script>

<template>
  <LoginView v-if="page === 'login'" @success="page = 'home'" />
  <HomeView v-else-if="page === 'home'" @enter-situation="page = 'situation'" />
  <SituationView v-else @home="page = 'home'" />
</template>
