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
import { call } from "@/contract/web3-util";
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
      getTokenPrice();
      console.log('登录成功', result);
    }).catch((reason) => {
      console.error('登录失败', reason);
    })
  }
})
onMounted(() => {
  // getTokenPrice();
})
// 获取当前价格
const tokenPrice = ref(0)
const getTokenPrice = async () => {
  try {
    const res = await call('manager', 'getTokenPrice', []);
    // 转换为以太币单位　保留四位小数　为后面计算usdt余额时使用　避免精度丢失
    tokenPrice.value = Number(Web3.utils.fromWei(res, 'ether'))
  } catch (err) {
    console.log(err)
  }
}
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
