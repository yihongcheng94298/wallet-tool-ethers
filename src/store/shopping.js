import { defineStore } from "pinia";

export const shoppingStore = defineStore('shopping', {
	state: () => {
		return {
			list:[ ],
            tokenInfo: {},
            oldItem: {},
            isAdd: false
		}
	},
	getters: {
        getInfo(state){
            return state.tokenInfo
        },
		getList(state) {
			return state.list
		},
        getOldItem(state){
            return state.oldItem
        },
        getAdd(state){
            return state.isAdd
        }
	},
	actions: {
		setInfo(obj) {
            this.tokenInfo = obj
		},
        setList(item) {
            this.isAdd = true
			this.list.push(item)
		},
        delList(item){
            this.oldItem = item;
            this.isAdd = false
            let i = 0;
            let index = 0
            while(i < this.list.length){
                if(this.list[i].id == item.id){
                    index = i;
                    break;
                }
                i++
            }
            this.list.splice(index,1)
        },
        clear(){
            this.isAdd = false
            this.list.splice(0,this.list.length)
        }
	}
})
