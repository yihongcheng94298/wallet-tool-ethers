<template>
  <!-- 引入headers组件 -->
  <headers></headers>
  <!-- 页面内容 -->
  <div class="root">
  </div>
</template>
<script setup>
import headers from '@/components/header/index.vue'
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Microsoft Yahei", sans-serif;
}

.root {
  padding: 20px;
}
</style>
