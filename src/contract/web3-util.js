import chainInfos from './chains'
import detectEthereumProvider from "@metamask/detect-provider"
import Web3 from "web3";
import {walletStore} from "@/store/wallet";
import {providerStore} from "@/store/provider";
const wStore = walletStore()
const pStore = providerStore()
const contracts = import.meta.glob('./contracts/*.json')

async function loadContract(contractName) {
	const contractPath = `./contracts/${contractName}.json`;

	if (contracts[contractPath]) {
		return await contracts[contractPath]();
	} else {
		console.error('未找到合约:', contractName);
	}
}

/**
 * 自定义异常
 */
class Web3Error{
	constructor(code, message) {
		this.code = code
		this.messsage = message
	}
}

/**
 * 连接类型：'wallet' - 钱包连接，'wss' - websocket连接，'http' - http连接
 *
 * @type {{WALLET: string, WSS: string, HTTP: string}}
 */
export const connectionType = {
	'WALLET': 'wallet',
	'WSS': 'wss',
	'HTTP': 'http'
}

/**
 * 获取websocket provider
 *
 * @param wsURL
 * @returns {WebsocketProvider|null}
 */
function getWSSProvider(wsURL) {
	try {
		return wsURL ? new Web3.providers.WebsocketProvider(wsURL) : null
	} catch (e) {
		console.error(e)
		return null
	}
}

/**
 * 获取http provider
 *
 * @param httpURL
 * @returns {HttpProvider|null}
 */
function getHTTPProvider(httpURL) {
	try {
		return httpURL ? new Web3.providers.HttpProvider(httpURL) : null
	} catch (e) {
		console.error(e)
		return null
	}
}

/**
 * 获取钱包自带的provider
 *
 * @returns {Promise<{coinDecimals: number, chainName: string, coinSymbol: string, chainId: number, coinName: string, rpcUrl: string, blockExplorerUrl: string}|any|MetaMaskEthereumProvider>}
 */
async function getWalletProvider() {
	try {
		return window.ethereum || Web3.givenProvider || await detectEthereumProvider()
	} catch (e) {
		console.error(e)
		return null
	}
}

/**
 * 根据配置文件获取provider
 *
 * @param config {wssURL: ***, httpURL: ***, type: ***}
 * @returns {Promise<{provider: *, type, key: string}|{provider: (Promise<{coinDecimals: number, chainName: string, coinSymbol: string, chainId: number, coinName: string, rpcUrl: string, blockExplorerUrl: string}|*|MetaMaskEthereumProvider>|Providers.WebsocketProvider|Providers.HttpProvider), type: string, key: string}>}
 */
export async function getProvider(config) {
	if (isNull(config)) {
		config = {
			wssURL: '',
			httpURL: '',
			type: connectionType.WALLET
		}
	}
	const key = Web3.utils.keccak256(JSON.stringify(config))

	// 从存储中取出provider
	let providerObj = pStore.getProvider(key)
	// 存储中存在provider
	if (providerObj) {
		return {
			key: key,
			type: providerObj.type,
			provider: providerObj.provider
		}
	}

	// 存储中不存在，则根据配置信息建立连接
	let type = config.type
	let provider = null
	if (config.type === connectionType.WSS) {
		if (config.wssURL) {
			provider = getWSSProvider(config.wssURL)
		} else {
			throw new Web3Error(-1002, 'Websocket connection failed!')
		}
	} else if (config.type === connectionType.HTTP) {
		if (config.httpURL) {
			provider = getHTTPProvider(config.httpURL)
		} else {
			throw new Web3Error(-1003,'HTTP connection failed!')
		}
	// 存在config中指定了为"wallet"，但浏览器不支持，就会用config中指定的wss或http url进行连接；还可能存在config中指定的type不是这三种类型，则也默认为"wallet"
	} else {
		type = connectionType.WALLET
		provider = await getWalletProvider()

		if (isNull(provider)) {
			if (config.wssURL) {
				provider = getWSSProvider(config.wssURL)
				type = connectionType.WSS
			} else if (config.httpURL) {
				provider = getHTTPProvider(config.httpURL)
				type = connectionType.HTTP
			}
		}
	}

	if (provider) {
		pStore.setProvider(key, type, provider)
		return {
			key: key,
			type: type,
			provider: provider
		}
	}

	throw new Web3Error(-1001, 'Connection failed or wallet not detected!')
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
 * 获取项目环境需要的链ID
 *
 * @returns {string|*}
 */
export function getChainID() {
	const chainInfo = chainInfos[getChain()]
	let chainId = chainInfo.chainId;
    wStore.setChainID(chainId)
	if (isNull(chainId)) {
		throw new Web3Error(-2001,'Chain info error')
	}

	if (!(('' + chainId).startsWith('0x'))) {
		chainId = '0x' + chainId.toString(16)
	}

	if (!/^0x[A-Fa-f0-9]+$/.test(chainId)) {
		throw new Web3Error(-2001,'Chain info error')
	}


	return chainId
}

/**
 * 将当前连接的账号设置到store中
 *
 * @param account
 */
function setCurAccount(account) {
	wStore.setCurAccount(account)
}

/**
 * 从store中获取当前连接的账号
 *
 * @returns {*}
 */
function getCurAccount() {
	return wStore.getCurAccount
}

/**
 * 建立连接，为默认连接
 *
 * @param config
 * @returns {Promise<void>}
 */
export async function connect (config) {

	const providerObj = await getProvider(config)

	if (pStore.default) {
		if (providerObj.type === connectionType.WALLET) {
			const provider = providerObj.provider
			if (provider) {
				provider.removeListener('accountsChanged', accountsChanged)
				provider.removeListener('chainChanged', chainChanged)
				provider.removeListener('connect', connectChanged)
				provider.removeListener('disconnect', connectChanged)
			}
		}
	}

	if (providerObj.type === connectionType.WSS
		|| providerObj.type === connectionType.HTTP) {
		pStore.setDefault(providerObj.key)
		return
	}

	const provider = providerObj.provider
	await switchNet(provider).then(async function (flag) {
        if (flag) {
			pStore.setDefault(providerObj.key)

			const accounts = await provider.request({ method: 'eth_requestAccounts' })
			if (accounts.length > 0) {
				await accountsChanged(accounts)
				provider.on('accountsChanged', accountsChanged)
				provider.on('connect', connectChanged)
				provider.on('disconnect', connectChanged)
			}
		} else {
			await disConnect()
		}
	})
}

/**
 * 连接钱包时将当前的区块链网络切换到需要的网络
 *
 * @param provider
 * @returns {Promise<boolean>}
 */
export async function switchNet (provider) {
	let flag = false
	const chainInfo = chainInfos[getChain()]
	try {
		await provider.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: getChainID() }]
		})

		flag = true
	} catch (switchError) {
		// This error code indicates that the chain has not been added to MetaMask.
		console.error(switchError)
		if (switchError.code === 4902 || switchError.code === -32603) {
			try {
				await provider.request({
					method: 'wallet_addEthereumChain',
					params: [{
						chainId: getChainID(),
						chainName: chainInfo.chainName,
						rpcUrls: [chainInfo.rpcUrl],
						blockExplorerUrls: [chainInfo.blockExplorerUrl],
						nativeCurrency: {
							name: chainInfo.coinName,
							symbol: chainInfo.coinSymbol,
							decimals: chainInfo.coinDecimals
						}
					}]
				})

				flag = true
			} catch (addError) {
				console.error('switchNet:', addError)
				// alert('Add ' + chainInfo.chainName + ' failed')
				throw new Web3Error(-1004, 'Add ' + chainInfo.chainName + ' failed')
			}
		} else {
			console.error('switchNet:', switchError)
			// alert('Switch ' + chainInfo.chainName + ' faild')
			throw new Web3Error(-1005,'Switch ' + chainInfo.chainName + ' failed')
		}
	}
	// 先移除已经添加的chainChanged事件监听，再添加，因为当chain changed时会再次调用该方法，避免重复添加listener
	if (flag) {
		provider.removeListener('chainChanged', chainChanged)
		provider.on('chainChanged', chainChanged)
	}

	return flag
}

/**
 * 连接的账号发生改变
 *
 * @param accounts
 * @returns {Promise<void>}
 */
export async function accountsChanged(accounts) {
	if (accounts.length === 0) {
		await disConnect()
	} else {
		const curAccount = accounts[0]
		// setCurAccount(curAccount)
		if (curAccount) {
			setCurAccount(curAccount)
		}
	}
}

/**
 * 连接的链发生改变
 *
 * @param chainId
 * @returns {Promise<void>}
 */
export async function chainChanged (chainId) {
	const chainInfo = chainInfos[getChain()]
	if (chainId !== getChainID()) {
		alert('The network has changed, please connect to ' + chainInfo.chainName)
		const providerObj = await getProvider()
		if (providerObj.type === connectionType.WALLET) {
			switchNet(providerObj.provider).then(async function (flag) {
				if (!flag) {
					await disConnect()
				}
			})
		}
	}
}

/**
 * 连接发生改变，监听事件为connect和disconnect
 *
 * @param chainId
 * @returns {Promise<void>}
 */
export async function connectChanged (chainId) {
	const providerObj = await getProvider()
	if (providerObj.type === connectionType.WALLET) {
		const provider = providerObj.provider
		if (isNull(provider)) {
			await disConnect()
		}
	}
}

/**
 * 断开连接，清空缓存，移除监听事件
 *
 * @returns {Promise<void>}
 */
export async function disConnect () {
	wStore.$reset()
	pStore.setDefault(null)

	const providerObj = await getProvider()
	if (providerObj.type === connectionType.WALLET) {
		const provider = providerObj.provider
		if (provider) {
			provider.removeListener('accountsChanged', accountsChanged)
			provider.removeListener('chainChanged', chainChanged)
			provider.removeListener('connect', connectChanged)
			provider.removeListener('disconnect', connectChanged)
		}
	}
}


//-----------------------------------------------------------------合约调用
export async function getContractAddress(contractName, chainName) {
	const contract = await loadContract(contractName)
	return contract[chainName ? chainName : getChain()]
}

export async function baseContract(abi, contractAddress, config) {
	const providerObj = await getProvider(config)
	const provider = providerObj.provider
	const web3 = new Web3(provider)
	const myContract = new web3.eth.Contract(abi, contractAddress)
	return {contract: myContract, abi: abi, address: contractAddress}
}

export async function baseCall(abi, contractAddress, funcName, params, from, config) {
	try {
		const funcABI = getFuncAbi(abi, funcName)
		const newParams = inputsParamsHandle(params, funcABI.inputs)
		const myContract = (await baseContract(abi, contractAddress, config)).contract
		return myContract.methods[funcABI.name](...newParams)
			.call({from: from ? from : getCurAccount()})
	} catch (error) {
		throw new Error(error)
	}
}

export async function baseSend(abi, contractAddress, funcName, params, value, config) {
	try {
		const funcABI = getFuncAbi(abi, funcName)
		const newParams = inputsParamsHandle(params, funcABI.inputs)
		if (isNull(value)) {
			value = 0
		}
		return (await baseContract(abi, contractAddress, config)).contract.methods[funcABI.name](...newParams)
			.send({from: getCurAccount(), value: value})
	} catch (error) {
		throw new Error(error)
	}
}

export async function contract(contractName, config, chainName) {
	const providerObj = await getProvider(config)
	const provider = providerObj.provider
	await switchNet(provider)
	const web3 = new Web3(provider)
	const contract = await loadContract(contractName)
	const myContract = new web3.eth.Contract(contract.abi, contract[chainName ? chainName : getChain()])
	return {contract: myContract, abi: contract.abi, address: contract[chainName ? chainName : getChain()], decimals: contract.decimals}
}

export async function ethBalance(account, config) {
	const providerObj = await getProvider(config)
	const provider = providerObj.provider
	const web3 = new Web3(provider)
	return web3.eth.getBalance(account)
}

export async function sendTransaction(target, config, value, data) {
	const providerObj = await getProvider(config)
	const provider = providerObj.provider
	const web3 = new Web3(provider)

	return web3.eth.sendTransaction({
		from: wStore.curAccount,
		to: target ?? wStore.curAccount,
		value: value ?? '0x0',
		// data: data ?? '0x0',
		maxFeePerGas: '3000000001',
		maxPriorityFeePerGas: '3000000000'
	})
}

export async function call(contractName, funcName, params, from, config, chainName) {
	try {
		const abi = getFuncAbi((await contract(contractName, config, chainName)).abi, funcName)
		const newParams = inputsParamsHandle(params, abi.inputs)
		const myContract = (await contract(contractName, config, chainName)).contract
		return myContract.methods[abi.name](...newParams)
			.call({from: from ? from : getCurAccount()})
	} catch (error) {
		throw new Error(error)
	}
}

export async function send(contractName, funcName, params, value, config) {
	try {
		const abi = getFuncAbi((await contract(contractName, config)).abi, funcName)
		const newParams = inputsParamsHandle(params, abi.inputs)
		if (isNull(value)) {
			value = 0
		}
		return (await contract(contractName, config)).contract.methods[abi.name](...newParams)
			.send({
				from: getCurAccount(),
				value: value,
				gasPrice: '2000000000'
			})
	} catch (error) {
		throw new Error(error)
	}
}

export function inputsParamsHandle (params, inputs) {
	const length = isNull(params) ? 0 : params.length
	// eslint-disable-next-line eqeqeq
	if (length != inputs?.length) {
		throw new Error('Incorrect input parameters')
	}

	if (length === 0) {
		return []
	}

	const newParams = []
	for (let i = 0; i < length; i++) {
		const input = inputs[i]

		let param = params[i]
		// if (param === '') {
		//   throw new Error('Incorrect input parameters')
		// }
		if (input.type.indexOf('[]') > -1) {
			let strs = param

			if (input.type.indexOf('int') > -1) {
				for (let j = 0; j < strs.length; j++) {
					// eslint-disable-next-line new-cap
					strs[j] = new Web3.utils.toBN(strs[j]).toString()
				}
			}

			newParams.push(strs)
			// } else if (input.type.indexOf('bytes') > -1) {
			//   newParams.push(Web3.utils.hexToBytes(param))
		} else if (input.type.indexOf('int') > -1) {
			newParams.push(Web3.utils.toBigInt(param).toString())
		} else {
			newParams.push(param)
		}
	}

	return newParams
}

export function fromWei(amount, decimals) {
	if (decimals > 18) {
		return 0
	} else if (decimals === 18) {
		return Web3.utils.fromWei(amount) - 0
	} else {
		return (Web3.utils.fromWei(amount) - 0) * (Math.pow(10, 18 - decimals))
	}
}

export function toWei(amount, decimals) {
	if (decimals > 18) {
		return 0
	} else if (decimals === 18) {
		return Web3.utils.toWei(amount) - 0
	} else {
		return (Web3.utils.toWei(amount) - 0) / (Math.pow(10, 18 - decimals))
	}
}

function getFuncAbi (abi, funcName) {
	if (isNull(abi)) {
		return null
	}

	for (let i = 0; i < abi.length; i++) {
		if (abi[i].name === funcName) {
			return abi[i]
		}
	}
}

function isNull (data) {
	if (typeof data === 'boolean') {
		return false
	}
	// eslint-disable-next-line eqeqeq
	if (typeof data === 'string') {
		return data.trim() === ''
	}
	return (data === '' || data === undefined || data == null)
}
