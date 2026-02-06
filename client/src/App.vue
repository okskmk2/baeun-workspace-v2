<template>
  <div class="app-root">
    <header class="gnb"><GNB /></header>
    <main class="app-main">
      <aside class="lnb"><LNB /></aside>
      <section class="content">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script>
import GNB from './components/GNB.vue'
import LNB from './components/LNB.vue'
export default {
  name: 'App',
  components: { GNB, LNB }
}
</script>

<style>
:root{
  --color-primary:#2563EB;
  --color-bg:#FFFFFF;
  --color-surface:#F9FAFB;
  --muted:#6B7280;
  --radius:8px;
}
html,body,#app{height:100%;margin:0}
.app-root{display:flex;flex-direction:column;height:100vh;background:var(--color-bg)}
.gnb{height:56px;display:flex;align-items:center;padding:0 16px;background:var(--color-bg);box-shadow:var(--shadow);z-index:20}
.app-main{display:flex;flex:1;overflow:hidden}
.lnb{width:240px;border-right:1px solid #eee;flex:0 0 240px}
.content{flex:1;overflow:auto;padding:16px;background:var(--color-surface);}
</style>
