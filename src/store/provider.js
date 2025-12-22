import {defineStore} from "pinia";

export const providerStore = defineStore('provider', {
	state: () => {
		return {
			provider: {},
			default: null   // 默认连接的key值，不为空，则表示已经连接
		}
	},
	getters: {
		getProvider(state) {
			return function (key) {
				let provider = null
				if (key) {
					provider = state.provider[key]
				}

				if (!provider && state.default) {
					provider = state.provider[state.default]
				}

				return provider
			}
		}
	},
	actions: {
		setProvider(key, type, _provider) {
			this.provider[key] = {}
			this.provider[key].provider = _provider
			this.provider[key].type = type
		},
		setDefault(_default) {
			this.default = _default
		}
	}
})
