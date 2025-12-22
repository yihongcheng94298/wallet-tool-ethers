import { defineStore } from "pinia";
import WebUtil from "@/utils/web-util";
import { walletStore } from "@/store/wallet"
import { memberStore } from "@/store/member"
import { getChainID, getProvider } from "@/contract/web3-util";
import Web3 from "web3";
import { end, start } from "@/api/loading";
import { login } from "@/api/user";
const wallet = walletStore()
const member = memberStore()

export const webStore = defineStore('web', {
	state: () => {
		return {
			loginState: false,
		}
	},
	getters: {
		getLoginState(state) {
			return state.loginState
		}
	},
	actions: {
		setLoginState(_loginState) {
			this.loginState = _loginState
		},
		isLogin() {
			let state = true
			if (!WebUtil.isLogin()) {
				wallet.$reset()
				WebUtil.removeBaseInfo()
				state = false
			}

			state = state && WebUtil.isDefine(wallet.curAccount)

			if (!state) {
				this.loginState = false
			}

			return state
		},
		async accountLogin() {
			const providerObj = await getProvider()
			const provider = providerObj.provider
			const curAccount = wallet.curAccount
			return new Promise(async function (resolve, reject) {
				WebUtil.saveBaseInfo({ curAccount: curAccount })
				// resolve(true)
				// return
				const web3 = new Web3(provider)

				const chainId = getChainID()
				const signTime = Date.now();

				let signInfoName = import.meta.env.VITE_APP_SIGN_INFO_NAME
				let baseURL = import.meta.env.VITE_APP_SIGN_INFO_URL

				const signStr = signInfoName + ' wants you to sign in with your account:\n' + curAccount + '\n\nSign in with account to the app.\n\nURI: ' + baseURL + '\nLogin time: ' + signTime
				start()
				web3.eth.personal.sign(signStr, curAccount, '').then(signature => {
					WebUtil.clearData();
					member.setisLogin(false)
					login({
						address: curAccount,
						signTime: signTime,
						signStr: signStr,
						loginSign: signature,
						device: WebUtil.getDevice()
					}).then(function (result) {
						end()
						if (WebUtil.isDefine(result)) {
							const code = result.data.code
							if (code === 1) {
								const token = result.data.data.token
								const salt = result.data.data.salt
								const pub = result.data.data.rsa

								member.setisLogin(true)
								WebUtil.saveData(token, salt, pub)
								WebUtil.saveBaseInfo({ curAccount: curAccount })
								resolve(true)
							} else {
								wallet.$reset()
								WebUtil.removeBaseInfo()
								reject(false)
							}
						} else {
							wallet.$reset()
							WebUtil.removeBaseInfo()
							reject(false)
						}
					}).catch(function (error) {
						end()
						wallet.$reset()
						WebUtil.removeBaseInfo()
						console.log(error)
						reject(false)
					})

				}).catch(() => {
					wallet.$reset()
					WebUtil.removeBaseInfo()
					end()
				})

			})
		}
	}
})
