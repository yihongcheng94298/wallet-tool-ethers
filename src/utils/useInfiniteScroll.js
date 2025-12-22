// global 全局滚动加载更多
import { onMounted, onBeforeUnmount } from 'vue'

export function useInfiniteScroll(containerRef, callback, delay = 200) {
  let timer = null
  const handleScroll = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const el = containerRef.value
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight } = el
      // 到底部 68px 内触发
      if (scrollTop + clientHeight >= scrollHeight - 68) {
        callback()
      }
    }, delay)
  }

  onMounted(() => containerRef.value?.addEventListener('scroll', handleScroll))
  onBeforeUnmount(() => containerRef.value?.removeEventListener('scroll', handleScroll))
}
