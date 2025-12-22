import { createRouter, createWebHashHistory } from 'vue-router'

const pages = import.meta.glob('../views/**/*.vue');
const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0 }
    },
    routes: [
        {
            path: '/',
            name: 'index',
            component: pages['../views/index/index.vue']
        },
    ]
})

export default router
