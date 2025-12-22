import WebUtil from '../utils/web-util'
import qs from 'qs'
import Util from '@/utils/common-util'
import request from "@/api/request";
import {walletStore} from "@/store/wallet";

const wStore = walletStore()

const api = {
    addNonce(params) {
        let data = JSON.parse(JSON.stringify(params))
        if (!WebUtil.isDefine(data)) {
            data = {}
        }
        const n = WebUtil.getRand(WebUtil.getRsaKey(WebUtil.getData().pub))
        data.nonceSrc = n.uid
        data.nonce = n.env
        data.deviceType = 'Web'
        data.address = wStore.curAccount
        return data
    },
    addNotCheckNonce(params) {
        let data = JSON.parse(JSON.stringify(params))
        if (!WebUtil.isDefine(data)) {
            data = {}
        }
        const n = WebUtil.getRand(WebUtil.getRsaKey())
        data.nonceSrc = n.uid
        data.nonce = n.env
        data.deviceType = 'Web'
        return data
    },
    assembleCheckData(params) {
        let data = JSON.parse(JSON.stringify(params))
        if (!WebUtil.isDefine(data)) {
            data = {}
        }
        return qs.stringify(WebUtil.createSign(this.addNonce(data), WebUtil.getData().token, WebUtil.getSalt(WebUtil.getData().salt)))
    },
    assembleNotCheckData(params) {
        let data = JSON.parse(JSON.stringify(params))
        if (!WebUtil.isDefine(data)) {
            data = {}
        }

        return qs.stringify(WebUtil.createSign(this.addNotCheckNonce(data), '', WebUtil.getSalt()))
    },
    assembleCheckDataGet(params) {
        let data = JSON.parse(JSON.stringify(params))
        if (!WebUtil.isDefine(data)) {
            data = {}
        }
        return WebUtil.createSign(this.addNonce(data), WebUtil.getData().token, WebUtil.getSalt(WebUtil.getData().salt))
    },
    check(url, method, data) {
        return request({
            url: url,
            method: method,
            data: this.assembleCheckData(data),
            headers: {
                token: WebUtil.getData().token
            }
        })
    },
    checkGet(url,method,data){
        return request({
            url: url,
            method: method,
            params: this.assembleCheckDataGet(data),
            headers: {
                token: WebUtil.getData().token
            }
        })
    },
    notCheck(url, method, data) {
        return request({
            url: url,
            method: method,
            data: this.assembleNotCheckData(data),
            headers: {
                token: ''
            }
        })
    },
    operateResult(result) {
        if (Util.isDefine(result)) {
            if (result.data.code === 1) {
                return result.data.data
            }
        }
    }
}

export default api
