import { ethers } from 'ethers'

import chainInfos from './chains'
import detectEthereumProvider from '@metamask/detect-provider'
import Web3 from 'web3'
import { walletStore } from '@/store/wallet'
import { providerStore } from '@/store/provider'
const wStore = walletStore()
const pStore = providerStore()
const contracts = import.meta.glob('./contracts/*.json')

export async function asconnectWallet() {
  let provider, signer, account
  // 检测 MetaMask 注入的 provider
  console.log('window.ethereum:', window.ethereum)
  if (window.ethereum) {
    // 链接到以太坊
    // 1. 创建只读 Provider（连接钱包节点）
    provider = new ethers.BrowserProvider(window.ethereum)
    console.log('provider:', provider)
    // 2. 请求授权并获取 Signer（带签名权限）
    signer = await provider.getSigner()
    console.log('signer:', signer)
    // 3. 获取当前账户
    account = await signer.getAddress()
    console.log('当前账户:', account)

    // 4. 等效签名（signMessage 对应 personal_sign）
    let signInfoName = 'wallet-tool-ethers'
    let baseURL = 'https://yimaibao.xyz'
		const signTime = Date.now();
    const message = signInfoName + ' wants you to sign in with your account:\n' + account + '\n\nSign in with account to the app.\n\nURI: ' + baseURL + '\nLogin time: ' + signTime
    const signature = await signer.signMessage(message);
    console.log("签名结果：", signature);

    // 5.调用后端登陆接口

  } else {
    alert('请安装 MetaMask')
  }
}
// // 检测 MetaMask 注入的 provider
// if (window.ethereum) {
//   // 1. 创建只读 Provider（连接钱包节点）
//   provider = new ethers.BrowserProvider(window.ethereum);
//   // 2. 请求授权并获取 Signer（带签名权限）
//   signer = await provider.getSigner();
//   // 3. 获取当前账户
//   account = await signer.getAddress();
// } else {
//   alert('请安装 MetaMask');
// }
