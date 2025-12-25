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
 * 加载合约
 * @param contractName 合约名称
 * @returns {Promise<*>}
 */
async function loadContract(contractName) {
  const contractPath = `./contracts/${contractName}.json`;

  if (contracts[contractPath]) {
    return await contracts[contractPath]();
  } else {
    console.error('未找到合约:', contractName);
  }
}

/**
  * 随机生成UUID
  * @param len    长度
  * @param radix  进制，例：10
  * @returns {string}
  */
export async function uuid(len, radix) {
  let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
  let uuid = []
  let i
  radix = radix || chars.length

  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix]
  } else {
    // rfc4122, version 4 form
    var r

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
    uuid[14] = '4'

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | Math.random() * 16
        uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r]
      }
    }
  }

  return uuid.join('')
}

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

/**
 * 获取项目环境需要的链名称
 *
 * @returns {string|string}
 */
export function getChain() {
  return import.meta.env.VITE_APP_CHAIN || 'bsc'
}

/**
 * 获取合约ABI中指定函数的ABI
 * @param abi 合约ABI
 * @param funcName 函数名称
 * @returns {*}
 */
function getFuncAbi(abi, funcName) {
  if (isNull(abi)) {
    return null
  }

  for (let i = 0; i < abi.length; i++) {
    if (abi[i].name === funcName) {
      return abi[i]
    }
  }
}

/**
 * 连接钱包
 */
export async function asConnectWallet() {
  let provider, signer, account
  // 检测 MetaMask 注入的 provider
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
    const signInfoName = 'YIMAIBAO'
    const baseURL = 'https://yimaibao.xyz'
    // const signInfoName = 'SOF'
    // const baseURL = 'https://sparkfire.space'
    const signTime = Date.now();
    const message = signInfoName + ' wants you to sign in with your account:\n' + account + '\n\nSign in with account to the app.\n\nURI: ' + baseURL + '\nLogin time: ' + signTime
    const signature = await signer.signMessage(message);
    console.log("签名结果：", signature);

    // loading 开始
    start()

    // 5.调用后端登陆接口
    await login({
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
    // const abi = getFuncAbi((await contract(contractName, config, chainName)).abi, funcName)
    const contractData = await loadContract('ais')
    console.log('contract9:', contractData);

    // 通用配置
    const ERC20_ABI = contractData.abi;
    const CONTRACT_ADDRESS = contractData.bsc; // DAI 合约示例
    console.log('ERC20_ABI:', ERC20_ABI);
    console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS);

    // 1. 创建合约实例（绑定 Provider = 只读）
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, provider);
    console.log('contract---------------------------', JSON.parse(JSON.stringify(contract)));
    // 2. 调用只读方法（直接调用，无需 .call()）
    try {
      const balance = await contract.balanceOf(account);
      console.log('余额：', ethers.formatEther(balance)); // 格式化 wei → ETH
    } catch (error) {
      console.log('获取余额失败:', error)
    }
    // const totalSupply = await contract.totalSupply();
    // // 注：ethers 自动处理 BigNumber 转换，可通过 .toString() 转字符串
    // console.log('余额：', ethers.formatEther(balance)); // 格式化 wei → ETH

    // try {
    //   balance = await provider.getBalance("ethers.eth")
    //   console.log('当前余额:', balance)
    // } catch (error) {
    //   console.log('获取余额失败:', error)
    // }

    // const balance = await provider.getBalance("ethers.eth")
    // console.log('当前余额:', balance)


  } else {
    alert('请安装 MetaMask')
  }
}


