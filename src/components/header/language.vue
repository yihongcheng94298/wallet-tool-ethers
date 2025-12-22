<template>
    <div class="language">
        <div @click="isLanguage()" class="current">
            <img src="@/static/images/header/language.png" />
        </div>
        <div class="language-set" v-show="showLanguage">
            <div>
                <div class="title">
                    <span>{{ $t('header.changLang') }}</span>
                    <!-- <img src="../../static/images/close.png" alt="" srcset=""> -->
                </div>
                <div class="list">
                    <div :class="item.value === language ? 'get-language' : ''" @click="handleLanguage(item.value)"
                        v-for="(item, index) in languageList" :key="index">
                        {{ item.name }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watchEffect } from 'vue';
import i18n from "@/i18n";

const language = ref('');
const showLanguage = ref(false);
const outside = ref('');

onMounted(() => {
    getLanguage();
    addListener();
})

const addListener = () => {
    document.body.addEventListener('click', function () {
        outside.value = true
    }, true)

    document.body.addEventListener('click', function () {
        if (outside.value) {
            showLanguage.value = false
        }
    })
}
const isLanguage = () => {
    outside.value = false;
    showLanguage.value = !showLanguage.value;
}
const getLanguage = () => {
    language.value = localStorage.getItem('locale') || 'en';
}
const languageList = reactive([
    { name: 'English', value: 'en' },
    // {name: '中文简体', value: 'cn'},
    { name: '中文繁体', value: 'cn' },
])
const handleLanguage = (value) => {
    i18n.global.locale.value = value;
    showLanguage.value = false;
    localStorage.setItem('locale', value);
    language.value = value
}
onBeforeUnmount(() => {
    document.body.removeEventListener('click', () => {

    })
})
</script>
<style scoped lang="less">
.language {
    display: flex;
    align-items: center;
    // position: relative;
    // z-index: 100;
    font-weight: bold;
}

.current {
    display: flex;
    align-items: center;
    font-weight: normal;
    font-size: 30px;
    border-radius: 50%;
    overflow: hidden;

    img {
        width: 30px;
        margin-left: 2px;

    }
}

.language-set {
    position: fixed;
    z-index: 10001;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100vh;
    background-color: rgba(0, 0, 0, .1);

    >div {
        position: relative;
        max-width: 720px;
        margin: 0 auto;
        z-index: 100001;
        background: linear-gradient(3600deg, #FFFFFF 0%, #DEF0FE 100%);
        padding: 24px;
    }

    .title {
        display: flex;
        align-items: center;
        justify-content: space-between;

        img {
            width: 20px;
        }
    }

    .list {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 36px;

        div {
            width: calc(50% - 36px);
            height: 24px;
            border: 1px solid rgb(35, 35, 35);
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 6px;
        }
    }
}

// .language-set div{
//     min-width: 70px;
//     text-align: center;
//     height: 30px;
//     line-height: 30px;
//     cursor: pointer;
// }
// .get-language{
//     color: white;
// }</style>
