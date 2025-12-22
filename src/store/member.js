import {defineStore} from "pinia";
import {walletStore} from "@/store/wallet";
import { loginInfo } from '@/api/user'

const wStore = walletStore()

export const memberStore = defineStore('member', {
	state: () => {
		return {
			memberInfo: {
				id: '',
                parent: '', 
				grade: '',
                nodeGrade: ''
			},
			paramParentAddress: '', // 分享链接中带的父级地址
			parentAddress: '', // 显示的父级地址,
            isLogin: false
        }
	},
	getters: {
		getMemberInfo(state) {
			return state.memberInfo
		},
		getParentAddress(state) {
			return state.parentAddress
		},
        getParamParentAddress(state){
            return state.paramParentAddress
        },
        getIsLogin(state){
            return state.isLogin;
        }
	},
	actions: {
		setMemberInfo(_memberInfo) {
			this.memberInfo = _memberInfo
		},
		setParamParentAddress(_paramParentAddress) {
			this.paramParentAddress = _paramParentAddress
		},
		setParentAddress(_parentAddress) {
			this.parentAddress = _parentAddress
		},
        setisLogin(_bool){
            this.isLogin = _bool
        },
		async queryMemberInfo() {
			if (wStore.curAccount) {
				const that = this;
                loginInfo().then(res => {
                    that.setMemberInfo(res.data.data.info)
                }).catch(err=>{

                })
			}
		}
	}
})
