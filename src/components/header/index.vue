<template>
    <!-- 头部 -->
    <div class="header-lay" :class="scrollY ? 'header-bg' : ''">
        <div class="left">
            <img @click="gobmb()" src="@/static/images/header/dapp-logo.png" />
        </div>
        <div class="right">
            <!-- 语言 国际化 -->
            <useLanguage></useLanguage>
            <!-- 链接钱包 -->
            <div class="link" v-if="wStore.curAccount">
                <img src="@/static/images/header/bnb-logo.png" alt="">
                <div>
                    {{ Util.omitAddress(wStore.curAccount, 10) }}
                </div>
            </div>
            <div class="link" v-else @click="connectWallet">
                <img src="@/static/images/header/bnb-logo.png" alt="">
                <div>{{ $t('header.link') }}</div>
            </div>
        </div>
    </div>
    <div class="gap"></div>
</template>
<script setup>
import { call, connect, send } from "@/contract/web3-util";
import Util from '@/utils/common-util'
import { walletStore } from "@/store/wallet";
import { memberStore } from "@/store/member";
import { computed, onMounted, ref, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import Web3 from "web3";
import i18n from "@/i18n";
import { end, start } from "@/api/loading";
import useLanguage from './language.vue'

const wStore = walletStore()
const mStore = memberStore()
const router = useRouter()

const scrollY = ref(0);

// 滚动事件处理函数
const handleScroll = () => {
    scrollY.value = window.scrollY;
};

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    const url = window.location.href;
    const queryString = url.includes('#') ? url.split('#')[1].split('?')[1] : url.split('?')[1];
    if (queryString) {
        const params = new URLSearchParams(queryString);
        const invite = params.get('invite');
        if (invite && invite != 'null') {
            localStorage.invite = invite;
            inputParentAddress.value = invite
        }
    }
})
onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
});
const gobmb = () => {
    router.push({
        path: '/'
    })
}

// 链接钱包
function connectWallet() {
    connect()
}
</script>
<style scoped src="./css/index.less" lang="less"></style>
