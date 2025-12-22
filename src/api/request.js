import axios from 'axios'
// import WebUtil from '../utils/web-util'
import { ElMessage } from 'element-plus'
import { start, end } from '@/api/loading'
import {walletStore} from "@/store/wallet";
import router from '../router';

const wStore = walletStore()

const service = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API, // url = base url + request url
    timeout: 30 * 1000 // request timeout
})

// request interceptor
service.interceptors.request.use(
    config => {
        // start()
        // config.headers['token'] = WebUtil.getData().token
        return config
    },
    error => {
        // do something with request error
        end()
        console.log(error) // for debug
        return Promise.reject(error)
    }
)

// response interceptor
service.interceptors.response.use(
    /**
     * If you want to get http information such as headers or status
     * Please return  response => response
     */

    /**
     * Determine the request status by custom code
     * Here is just an example
     * You can also judge the status by HTTP Status Code
     */
    response => {
        const res = response.status
        // if the custom code is not 20000, it is judged as an error.
        if (res !== 200) {
            end()
            ElMessage({
                message: res.message || 'Error',
                type: 'error',
                duration: 1000
            })

            return Promise.reject(new Error(res.message || 'Error'))
        } else {
            if (response.data.code === 500) {
                end()
                ElMessage({
                    message: response.data.msg,
                    type: 'error'
                })
            } else if (response.data.code === 2) {
                end()
                ElMessage({
                    message: response.data.msg,
                    type: 'error'
                })
                return
            } else if (response.data.code === 401) {
                end()
                // WebUtil.clearData()
                wStore.$reset()
                ElMessage({
                    message: response.data.msg,
                    type: 'error'
                })
            }else if(response.data.code === 1000){
                end()
                ElMessage({
                    message: response.data.msg,
                    type: 'error'
                })
                router.push({
                    path: '/maintain'
                })
                return
            }

            return response
        }
    },
    error => {
        end()
        console.log('err' + error) // for debug
        ElMessage({
            message: error.message,
            type: 'error',
            duration: 1000
        })
        return Promise.reject(error)
    }
)
export default service
