import Api from '@/api/index'

export function login(loginInfo) {
  return Api.notCheck(
      '/api/dapp/wallet/login',
      'post',
      loginInfo
  )
}

// 获取登录信息
export function exist(data) {
    return Api.notCheck(
        '/api/dapp/member/exist',
        'post',
        data
    )
}

// 会员邀请信息
export function recommendInfo(data) {
    return Api.check(
        '/api/dapp/member/recommend/info',
        'post',
        data
    )
}
// 会员推荐列表
export function recommendPage(data) {
    return Api.check(
        '/api/dapp/member/recommend/page',
        'post',
        data
    )
}


// 获取登录信息
export function loginInfo(data) {
    return Api.check(
        '/api/dapp/member/loginInfo',
        'post',
        data
    )
}
//账号绑定
export function reg(loginInfo) {
    return Api.check(
        '/api/dapp/member/reg',
        'post',
        loginInfo
    )
  }

export function myOverview(data) {
    return Api.check(
        '/api/dapp/member/my/overview',
        'post',
        data
    )
}
export function myRecommend(data) {
    return Api.check(
        '/api/dapp/member/my/recommend',
        'post',
        data
    )
}
export function limitOverview(data) {
    return Api.check(
        '/api/dapp/member/my/withdraw/limit/overview',
        'post',
        data
    )
}
export function limitDetail(data) {
    return Api.check(
        '/api/dapp/member/my/withdraw/limit/detail',
        'post',
        data
    )
}
export function lpOverview(data) {
    return Api.check(
        '/api/dapp/member/my/lp/overview',
        'post',
        data
    )
}
export function lpContribute(data) {
    return Api.check(
        '/api/dapp/member/my/lp/contribute',
        'post',
        data
    )
}