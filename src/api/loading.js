import { ElLoading } from 'element-plus'
let load
let timer
let isStart = false
export function start() {
  if (isStart) {
    return
  }

  isStart = true
  load = ElLoading.service({
    lock: true,
    text: 'loading',
    background: 'rgba(0,0,0,0.7)'
  })

  timer = setTimeout(end, 120 * 1000) // 超时120秒，则自动关闭
}
export function end() {
  isStart = false
  clearTimeout(timer)
  if (load) {
    load.close()
  }
}
