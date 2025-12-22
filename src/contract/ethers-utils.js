import { ethers } from 'ethers'

import chainInfos from './chains'
import detectEthereumProvider from '@metamask/detect-provider'
import Web3 from 'web3'
import { end, start } from "@/api/loading";
import { login } from "@/api/user";
import { walletStore } from '@/store/wallet'
import { providerStore } from '@/store/provider'
const wStore = walletStore()
const pStore = providerStore()
const contracts = import.meta.glob('./contracts/*.json')

/**
  * 参数是否被定义
  */
export async function isDefine(para) {
  if (typeof para === 'undefined' || para === '' || para === null || para !== para) {
    // para !== para checks for NaN
    return false
  }

  if (typeof para === 'object' && Object.keys(para).length === 0 && para.constructor === Object) {
    // checks for empty objects
    return false
  }

  if (Array.isArray(para) && para.length === 0) {
    // checks for empty arrays
    return false
  }

  return true
}
/**
 * 获取device
 */
export async function getDevice() {
  let device = sessionStorage.getItem('device')
  if (!await isDefine(device) || device.length === 0) {
    device = uuid(32, 16)
    sessionStorage.setItem('device', device)
  }

  return device
}
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
    start()
    // 5.调用后端登陆接口
    login({
      address: account,
      signTime: signTime,
      signStr: message,
      loginSign: signature,
      device: await getDevice()
    }).then(function (result) {
      end()
      const code = result.data?.code || 0
      if (code === 1) {
        const token = result.data.data.token
        const salt = result.data.data.salt
        console.log('token:', token)
        console.log('salt:', salt)
      } else {
        alert(result.data.msg)
      }
    })


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
