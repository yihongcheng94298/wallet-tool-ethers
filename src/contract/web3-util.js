import chainInfos from './chains'
import { ethers } from 'ethers'
import { walletStore } from "@/store/wallet";
import { providerStore } from "@/store/provider";

const wStore = walletStore()
const pStore = providerStore()
const contracts = import.meta.glob('./contracts/*.json')

/**
 * 加载合约ABI和地址配置
 * @param {string} contractName 合约名称
 * @returns {Promise<Object>} 合约配置对象
 */
async function loadContract(contractName) {
	const contractPath = `./contracts/${contractName}.json`;
	if (contracts[contractPath]) {
		return await contracts[contractPath]();
	} else {
		console.error('未找到合约:', contractName);
		throw new Error(`Contract ${contractName} not found (-3001)`);
	}
}

/**
 * 连接类型枚举
 * @type {{WALLET: string, WSS: string, HTTP: string}}
 */
export const connectionType = {
	WALLET: 'wallet',
	WSS: 'wss',
	HTTP: 'http'
};

/**
 * 创建WS Provider
 * @param {string} wsURL WS地址
 * @returns {ethers.WebSocketProvider|null}
 */
function getWSSProvider(wsURL) {
	try {
		return wsURL ? new ethers.WebSocketProvider(wsURL) : null;
	} catch (e) {
		console.error('WSS Provider创建失败:', e);
		return null;
	}
}

/**
 * 创建HTTP Provider
 * @param {string} httpURL HTTP地址
 * @returns {ethers.JsonRpcProvider|null}
 */
function getHTTPProvider(httpURL) {
	try {
		return httpURL ? new ethers.JsonRpcProvider(httpURL) : null;
	} catch (e) {
		console.error('HTTP Provider创建失败:', e);
		return null;
	}
}


/**
 * 检查数据是否为空
 * @param {any} data 待检查数据
 * @returns {boolean} 是否为空
 */
function isNull(data) {
	if (typeof data === 'boolean') return false;
	if (typeof data === 'string') return data.trim() === '';
	return data === '' || data === undefined || data === null;
}

/**
 * 获取或创建Provider
 * @param {Object} config 连接配置
 * @returns {Promise<{key: string, type: string, provider: ethers.Provider, ethereum?: MetaMaskEthereumProvider}>}
 */
export async function getProvider(config) {
	if (isNull(config)) {
		config = {
			wssURL: '',
			httpURL: '',
			type: connectionType.WALLET
		};
	}

	// 生成唯一key
	const key = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(config)));

	// 从缓存获取
	const cachedProvider = pStore.getProvider(key);
	if (cachedProvider) {
		return {
			key,
			type: cachedProvider.type,
			provider: cachedProvider.provider,
			ethereum: cachedProvider.ethereum // 携带原生provider
		};
	}

	// 创建新Provider
	let type = config.type;
	let provider = null;
	let ethereum = null; // 保存原生钱包provider

	switch (type) {
		case connectionType.WSS:
			if (!config.wssURL) throw new Error('Websocket URL不能为空 (-1002)');
			provider = getWSSProvider(config.wssURL);
			break;

		case connectionType.HTTP:
			if (!config.httpURL) throw new Error('HTTP URL不能为空 (-1003)');
			provider = getHTTPProvider(config.httpURL);
			break;

		default:
			// 默认使用钱包连接，失败则降级到WS/HTTP
			type = connectionType.WALLET;
			// 检测 MetaMask 注入的 provider
			if (window.ethereum) {
				// 1. 创建只读 Provider（连接钱包节点）
				provider = new ethers.BrowserProvider(window.ethereum)
			}

			if (isNull(provider)) {
				if (config.wssURL) {
					provider = getWSSProvider(config.wssURL);
					type = connectionType.WSS;
				} else if (config.httpURL) {
					provider = getHTTPProvider(config.httpURL);
					type = connectionType.HTTP;
				}
			}
	}

	if (!provider) {
		throw new Error('连接失败或未检测到钱包 (-1001)');
	}

	// 缓存Provider（包含原生provider）
	pStore.setProvider(key, type, provider, ethereum);
	return { key, type, provider, ethereum };
}

/**
 * 获取当前链名称
 * @returns {string} 链名称
 */
export function getChain() {
	return import.meta.env.VITE_APP_CHAIN || 'bsc';
}

/**
 * 获取当前链ID (十六进制)
 * @returns {string} 链ID
 */
export function getChainID() {
	const chainInfo = chainInfos[getChain()]
	let chainId = chainInfo.chainId;
	wStore.setChainID(chainId)
	if (isNull(chainId)) {
		throw new Error('Chain info error (-2001)')
	}

	if (!(('' + chainId).startsWith('0x'))) {
		chainId = '0x' + chainId.toString(16)
	}

	if (!/^0x[A-Fa-f0-9]+$/.test(chainId)) {
		throw new Error('Chain info error (-2001)')
	}
	return chainId
}

/**
 * 设置当前账户
 * @param {string} account 账户地址
 */
function setCurAccount(account) {
	wStore.setCurAccount(account);
}

/**
 * 获取当前账户
 * @returns {string} 账户地址
 */
function getCurAccount() {
	return wStore.getCurAccount;
}

/**
 * 切换网络
 * @param {ethers.BrowserProvider} provider 钱包Provider
 * @returns {Promise<boolean>} 是否切换成功
 */
export async function switchNet(provider) {
	if (!(provider instanceof ethers.BrowserProvider)) {
		return true; // 非钱包Provider无需切换网络
	}

	const chainInfo = chainInfos[getChain()];
	const chainId = getChainID();

	try {
		// 尝试切换网络
		await provider.send('wallet_switchEthereumChain', [{ chainId }]);
		return true;
	} catch (switchError) {
		// 4902: 链未添加, -32603: 其他RPC错误
		if (switchError.code === 4902 || switchError.code === -32603) {
			try {
				// 添加新网络
				await provider.send('wallet_addEthereumChain', [{
					chainId,
					chainName: chainInfo.chainName,
					rpcUrls: [chainInfo.rpcUrl],
					blockExplorerUrls: [chainInfo.blockExplorerUrl],
					nativeCurrency: {
						name: chainInfo.coinName,
						symbol: chainInfo.coinSymbol,
						decimals: chainInfo.coinDecimals
					}
				}]);
				return true;
			} catch (addError) {
				console.error('添加网络失败:', addError);
				throw new Error(`添加${chainInfo.chainName}网络失败 (-1004)`);
			}
		}
		return false; // 其他错误返回切换失败
	}
}

/**
 * 账户变更处理
 * @param {string[]} accounts 账户列表
 */
async function accountsChanged(accounts) {
	if (accounts.length === 0) {
		await disConnect();
	} else {
		setCurAccount(ethers.getAddress(accounts[0])); // 标准化地址
	}
}

/**
 * 链变更处理
 * @param {string} chainId 新链ID
 */
async function chainChanged(chainId) {
	const chainInfo = chainInfos[getChain()];
	if (chainId !== getChainID()) {
		alert(`网络已变更，请切换至${chainInfo.chainName}`);

		const providerObj = await getProvider();
		if (providerObj.type === connectionType.WALLET) {
			const success = await switchNet(providerObj.provider);
			if (!success) await disConnect();
		}
	}
}

/**
 * 连接状态变更处理
 */
async function connectChanged() {
	const providerObj = await getProvider();
	if (providerObj.type === connectionType.WALLET) {
		const signer = await providerObj.provider.getSigner().catch(() => null);
		if (!signer) await disConnect();
	}
}

/**
 * 移除钱包事件监听器
 * @param {MetaMaskEthereumProvider} ethereum 原生钱包Provider
 */
function removeWalletListeners(ethereum) {
	if (!ethereum) return;
	try {
		ethereum.removeListener('accountsChanged', accountsChanged);
		ethereum.removeListener('chainChanged', chainChanged);
		ethereum.removeListener('connect', connectChanged);
		ethereum.removeListener('disconnect', connectChanged);
	} catch (e) {
		console.warn('移除监听器失败:', e);
	}
}

/**
 * 添加钱包事件监听器
 * @param {MetaMaskEthereumProvider} ethereum 原生钱包Provider
 */
function addWalletListeners(ethereum) {
	if (!ethereum) return;
	try {
		// 先移除再添加，避免重复监听
		removeWalletListeners(ethereum);
		ethereum.on('accountsChanged', accountsChanged);
		ethereum.on('chainChanged', chainChanged);
		ethereum.on('connect', connectChanged);
		ethereum.on('disconnect', connectChanged);
	} catch (e) {
		console.warn('添加监听器失败:', e);
	}
}

/**
 * 建立连接
 * @param {Object} config 连接配置
 */
export async function connect(config) {
	const providerObj = await getProvider(config);
	const { provider, type, key, ethereum } = providerObj;

	// 移除旧的监听器
	if (pStore.default) {
		const oldProviderObj = pStore.getProvider(pStore.default);
		if (oldProviderObj?.type === connectionType.WALLET) {
			removeWalletListeners(oldProviderObj.ethereum);
		}
	}

	// 非钱包连接直接设置默认
	if (type === connectionType.WSS || type === connectionType.HTTP) {
		pStore.setDefault(key);
		return;
	}

	// 钱包连接处理
	if (!(provider instanceof ethers.BrowserProvider)) {
		throw new Error('钱包Provider类型错误 (-1006)');
	}

	// 切换网络
	const switchSuccess = await switchNet(provider);
	if (!switchSuccess) {
		await disConnect();
		return;
	}

	// 设置默认Provider
	pStore.setDefault(key);

	// 请求账户授权
	const accounts = await provider.send('eth_requestAccounts', []);
	if (accounts.length > 0) {
		await accountsChanged(accounts);
		// 直接使用原生provider添加事件监听
		addWalletListeners(ethereum);
	}
}

/**
 * 断开连接
 */
export async function disConnect() {
	// 重置状态
	wStore.$reset();
	const defaultKey = pStore.default;

	// 移除监听器
	if (defaultKey) {
		const providerObj = pStore.getProvider(defaultKey);
		if (providerObj?.type === connectionType.WALLET) {
			removeWalletListeners(providerObj.ethereum);
		}
	}

	// 清空默认Provider
	pStore.setDefault(null);
}

/**
 * 获取合约地址
 * @param {string} contractName 合约名称
 * @param {string} [chainName] 链名称
 * @returns {Promise<string>} 合约地址
 */
export async function getContractAddress(contractName, chainName) {
	const contract = await loadContract(contractName);
	const targetChain = chainName || getChain();
	const address = contract[targetChain];

	if (isNull(address)) {
		throw new Error(`合约${contractName}在${targetChain}链上的地址未配置 (-3002)`);
	}

	return ethers.getAddress(address); // 标准化地址
}

/**
 * 创建合约实例
 * @param {string} contractName 合约名称
 * @param {Object} [config] 连接配置
 * @param {string} [chainName] 链名称
 * @returns {Promise<{contract: ethers.Contract, abi: Array, address: string, decimals: number}>}
 */
export async function contract(contractName, config, chainName) {
	const providerObj = await getProvider(config);
	const { provider } = providerObj;

	// 钱包连接时切换网络
	if (providerObj.type === connectionType.WALLET) {
		await switchNet(provider);
	}

	// 加载合约配置
	const contractConfig = await loadContract(contractName);
	const address = await getContractAddress(contractName, chainName);
	const abi = contractConfig.abi;
	const decimals = contractConfig.decimals || 18;

	// 获取Signer (钱包连接时)
	let signerOrProvider = provider;
	if (provider instanceof ethers.BrowserProvider) {
		signerOrProvider = await provider.getSigner();
	}

	// 创建合约实例
	const contractInstance = new ethers.Contract(address, abi, signerOrProvider);

	return {
		contract: contractInstance,
		abi,
		address,
		decimals
	};
}

/**
 * 获取ETH余额
 * @param {string} account 账户地址
 * @param {Object} [config] 连接配置
 * @returns {Promise<ethers.BigNumber>} 余额
 */
export async function ethBalance(account, config) {
	const providerObj = await getProvider(config);
	return providerObj.provider.getBalance(account);
}

/**
 * 发送原生代币交易
 * @param {string} target 目标地址
 * @param {Object} [config] 连接配置
 * @param {ethers.BigNumber|string|number} [value] 发送金额
 * @param {string} [data] 交易数据
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function sendTransaction(target, config, value, data) {
	const providerObj = await getProvider(config);

	if (providerObj.type !== connectionType.WALLET) {
		throw new Error('仅钱包连接支持发送交易 (-1007)');
	}

	const signer = await providerObj.provider.getSigner();
	const tx = {
		to: target || await signer.getAddress(),
		value: value || ethers.parseEther('0'),
		data: data || '0x',
		maxFeePerGas: ethers.parseUnits('3000000001', 'wei'),
		maxPriorityFeePerGas: ethers.parseUnits('3000000000', 'wei')
	};

	return signer.sendTransaction(tx);
}

/**
 * 处理合约输入参数
 * @param {Array} params 输入参数
 * @param {Array} inputs ABI输入定义
 * @returns {Array} 处理后的参数
 */
export function inputsParamsHandle(params, inputs) {
	const paramLength = isNull(params) ? 0 : params.length;
	const inputLength = inputs?.length || 0;

	if (paramLength !== inputLength) {
		throw new Error('输入参数数量不匹配 (-3003)');
	}

	if (paramLength === 0) return [];

	const processedParams = [];
	for (let i = 0; i < paramLength; i++) {
		const input = inputs[i];
		let param = params[i];

		// 数组类型处理
		if (input.type.endsWith('[]')) {
			if (!Array.isArray(param)) {
				throw new Error(`参数${i}应为数组类型 (-3004)`);
			}

			// 整数数组处理
			if (input.type.includes('int')) {
				param = param.map(p => ethers.BigNumber.from(p));
			}
			processedParams.push(param);
		}
		// 整数类型处理
		else if (input.type.includes('int') || input.type.includes('uint')) {
			processedParams.push(ethers.BigNumber.from(param));
		}
		// 地址类型处理
		else if (input.type === 'address') {
			processedParams.push(ethers.getAddress(param));
		}
		// 其他类型直接返回
		else {
			processedParams.push(param);
		}
	}

	return processedParams;
}

/**
 * 获取合约方法的ABI
 * @param {Array} abi 合约ABI
 * @param {string} funcName 方法名
 * @returns {Object} 方法ABI
 */
function getFuncAbi(abi, funcName) {
	if (isNull(abi)) {
		throw new Error('合约ABI为空 (-3005)');
	}

	const funcAbi = abi.find(item => item.name === funcName && item.type === 'function');
	if (!funcAbi) {
		throw new Error(`合约方法${funcName}不存在 (-3006)`);
	}

	return funcAbi;
}

/**
 * 调用合约只读方法
 * @param {string} contractName 合约名称
 * @param {string} funcName 方法名
 * @param {Array} [params] 方法参数
 * @param {string} [from] 调用者地址
 * @param {Object} [config] 连接配置
 * @param {string} [chainName] 链名称
 * @returns {Promise<any>} 调用结果
 */
export async function call(contractName, funcName, params = [], from, config, chainName) {
	try {
		const { contract, abi } = await contract(contractName, config, chainName);
		const funcAbi = getFuncAbi(abi, funcName);
		const processedParams = inputsParamsHandle(params, funcAbi.inputs);

		// 执行调用
		const result = await contract[funcName](...processedParams);
		return result;
	} catch (error) {
		console.error('合约调用失败:', error);
		throw new Error(`调用${funcName}失败: ${error.message} (-3007)`);
	}
}

/**
 * 发送合约写方法交易
 * @param {string} contractName 合约名称
 * @param {string} funcName 方法名
 * @param {Array} [params] 方法参数
 * @param {ethers.BigNumber|string|number} [value] 附带ETH金额
 * @param {Object} [config] 连接配置
 * @returns {Promise<ethers.TransactionResponse>} 交易响应
 */
export async function send(contractName, funcName, params = [], value, config) {
	try {
		const { contract, abi } = await contract(contractName, config);
		const funcAbi = getFuncAbi(abi, funcName);
		const processedParams = inputsParamsHandle(params, funcAbi.inputs);

		// 处理发送金额
		const sendValue = isNull(value) ? ethers.parseEther('0') : ethers.BigNumber.from(value);

		// 发送交易
		const tx = await contract[funcName](...processedParams, {
			value: sendValue,
			gasPrice: ethers.parseUnits('2000000000', 'wei')
		});

		return tx;
	} catch (error) {
		console.error('合约交易发送失败:', error);
		throw new Error(`发送${funcName}交易失败: ${error.message} (-3008)`);
	}
}

/**
 * 从Wei单位转换为可读单位
 * @param {ethers.BigNumber|string|number} amount 金额(Wei)
 * @param {number} decimals 小数位数
 * @returns {number} 转换后金额
 */
export function fromWei(amount, decimals) {
	if (decimals > 18 || isNull(amount)) return 0;

	const bnAmount = ethers.BigNumber.from(amount);
	return Number(ethers.formatUnits(bnAmount, decimals));
}

/**
 * 转换为Wei单位
 * @param {string|number} amount 金额
 * @param {number} decimals 小数位数
 * @returns {ethers.BigNumber} Wei单位金额
 */
export function toWei(amount, decimals) {
	if (decimals > 18 || isNull(amount)) return ethers.BigNumber.from(0);
	return ethers.parseUnits(amount.toString(), decimals);
}

/**
 * 基础合约调用 (底层方法)
 * @deprecated 建议使用contract + call/send方法
 */
export async function baseCall(abi, contractAddress, funcName, params, from, config) {
	const providerObj = await getProvider(config);
	const contractInstance = new ethers.Contract(
		contractAddress,
		abi,
		providerObj.provider
	);

	const funcAbi = getFuncAbi(abi, funcName);
	const processedParams = inputsParamsHandle(params, funcAbi.inputs);

	return contractInstance[funcName](...processedParams, { from });
}

/**
 * 基础合约交易 (底层方法)
 * @deprecated 建议使用contract + call/send方法
 */
export async function baseSend(abi, contractAddress, funcName, params, value, config) {
	const providerObj = await getProvider(config);

	if (providerObj.type !== connectionType.WALLET) {
		throw new Error('仅钱包连接支持发送交易 (-1007)');
	}

	const signer = await providerObj.provider.getSigner();
	const contractInstance = new ethers.Contract(contractAddress, abi, signer);

	const funcAbi = getFuncAbi(abi, funcName);
	const processedParams = inputsParamsHandle(params, funcAbi.inputs);

	const sendValue = isNull(value) ? 0 : ethers.BigNumber.from(value);
	return contractInstance[funcName](...processedParams, { value: sendValue });
}

/**
 * 基础合约实例创建 (底层方法)
 * @deprecated 建议使用contract方法
 */
export async function baseContract(abi, contractAddress, config) {
	const providerObj = await getProvider(config);

	let signerOrProvider = providerObj.provider;
	if (providerObj.type === connectionType.WALLET) {
		signerOrProvider = await providerObj.provider.getSigner();
	}

	const contractInstance = new ethers.Contract(contractAddress, abi, signerOrProvider);
	return {
		contract: contractInstance,
		abi,
		address: contractAddress
	};
}