import { defineStore } from "pinia";
import WebUtil from "@/utils/web-util";
import { walletStore } from "@/store/wallet";
import { memberStore } from "@/store/member";
import { ethers } from "ethers"; // 引入ethers
import { end, start } from "@/api/loading";
import { login } from "@/api/user";

const wallet = walletStore();
const member = memberStore();

export const webStore = defineStore('web', {
	state: () => ({
		loginState: false,
	}),
	getters: {
		getLoginState(state) {
			return state.loginState;
		}
	},
	actions: {
		setLoginState(_loginState) {
			this.loginState = _loginState;
		},
		isLogin() {
			let state = true;

			// 检查基础登录状态
			if (!WebUtil.isLogin()) {
				wallet.$reset();
				WebUtil.removeBaseInfo();
				state = false;
			}

			// 检查钱包账户是否存在
			state = state && WebUtil.isDefine(wallet.curAccount);

			// 更新登录状态
			if (!state) {
				this.loginState = false;
			}

			return state;
		},
		async accountLogin() {
			let provider, signer, curAccount
			try {
				if (window.ethereum) {
					// 链接到以太坊
					// 1. 创建只读 Provider（连接钱包节点）
					provider = new ethers.BrowserProvider(window.ethereum)
					console.log('provider:', provider)
					// 2. 请求授权并获取 Signer（带签名权限）
					signer = await provider.getSigner()
					console.log('signer:', signer)
					// 3. 获取当前账户
					curAccount = await signer.getAddress()
					console.log('当前账户:', curAccount)
				}

				// 验证账户是否存在
				if (!WebUtil.isDefine(curAccount)) {
					throw new Error("当前钱包账户未定义");
				}
				// 保存基础账户信息
				WebUtil.saveBaseInfo({ curAccount });

				if (provider && provider.getSigner) {
					try {
						signer = await provider.getSigner();
					} catch (e) {
						console.warn('获取默认签名器失败，尝试指定地址:', e);
						signer = provider.getSigner(curAccount);
					}
				} else {
					// 非钱包Provider不支持签名，抛出错误
					throw new Error("仅钱包连接支持签名登录");
				}

				// 构建签名信息
				const signTime = Date.now();
				const signInfoName = import.meta.env.VITE_APP_SIGN_INFO_NAME || "AppName";
				const baseURL = import.meta.env.VITE_APP_SIGN_INFO_URL || window.location.origin;

				// 标准化签名消息（符合EIP-191规范）
				const message = `${signInfoName} wants you to sign in with your account:\n${curAccount}\n\nSign in with account to the app.\n\nURI: ${baseURL}\nLogin time: ${signTime}`;

				// 开始加载状态
				start();

				// 使用Ethers进行签名（替代web3.eth.personal.sign）
				const signature = await signer.signMessage(message);

				// 清空旧数据，准备登录
				WebUtil.clearData();
				member.setisLogin(false);

				// 调用登录接口
				const result = await login({
					address: curAccount,
					signTime,
					signStr: message,
					loginSign: signature,
					device: WebUtil.getDevice()
				});

				// 结束加载状态
				end();

				// 处理登录结果
				if (WebUtil.isDefine(result) && result.data?.code === 1) {
					const { token, salt, rsa: pub } = result.data.data;
					// 保存登录信息
					member.setisLogin(true);
					WebUtil.saveData(token, salt, pub);
					WebUtil.saveBaseInfo({ curAccount });
					this.loginState = true; // 更新登录状态
					return Promise.resolve(true);
				} else {
					// 登录失败，重置状态
					wallet.$reset();
					WebUtil.removeBaseInfo();
					this.loginState = false;
					return Promise.reject(false);
				}
			} catch (error) {
				// 捕获所有异常，统一处理
				end(); // 确保结束加载状态
				console.error("账户登录失败:", error);
				// 重置钱包和基础信息
				wallet.$reset();
				WebUtil.removeBaseInfo();
				this.loginState = false;
				return Promise.reject(false);
			}
		}
	}
});