<template>
  <!-- 引入headers组件 -->
  <headers></headers>
  <!-- 页面内容 -->
  <div class="root">
  </div>
</template>
<script setup>
import headers from '@/components/header/index.vue'
import { computed, onMounted, ref, watch, } from "vue";
import { walletStore } from "@/store/wallet";
import { webStore } from "@/store/web";
const wbStore = webStore()
const wStore = walletStore()
// 监听当前账户变化，自动登录
const curAccount = computed(() => {
  return wStore.curAccount
})
watch(curAccount, (newVal, oldVal) => {
  // 当账户变化时，自动登录 需要在这里初始化数据
  if (newVal) {
    wbStore.accountLogin().then((result) => {
      console.log('登录成功', result);
    }).catch((reason) => {
      console.error('登录失败', reason);
    })
  }
})
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
