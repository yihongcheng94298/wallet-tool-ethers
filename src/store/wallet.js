import { defineStore } from "pinia";

export const walletStore = defineStore('wallet', {
	state: () => {
		return {
			curAccount: null,//当前账户
			chainID: ''
		}
	},
	getters: {
		getCurAccount(state) {
			return state.curAccount
		},
		getChainID(state) {
			return state.chainID
		}
	},
	actions: {
		setCurAccount(_curAccount) {
			this.curAccount = _curAccount
		},
		setChainID(_chainID) {
			this.chainID = _chainID
		}
	}
})
