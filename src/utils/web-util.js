import forge from 'node-forge';

const defaultPub = 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJ94UfkNc3t0kOgT2nTR6VVrOj6BOIQ2' +
  '2WYBaxxC68R0dDadpx2XLj9Y3HZl1AjGxZCUP2luRnkm9aHyooIME7UCAwEAAQ=='

const defaultSalt = 'OhMu21G4whkkt66w'
const ap = '8@Q4!FhAQ!hvEznhJYNKqeCYn9wZvxgX'

const WebUtil = {
  /**
   * 获取随机盐
   *
   * @param salt
   * @returns {string|*}
   */
  getSalt(salt) {
    if (!this.isDefine(salt)) {
      return defaultSalt
    } else {
      return salt
    }
  },

  /**
   * 生成随机字符串，并用公钥加密
   *
   * @returns {{uid: string, env: *}}
   */
  getRand(key) {
    const uid = this.uuid(32, 16)
    const env = forge.util.encode64(key.encrypt(uid))
    return { uid: uid, env: env }
  },

  /**
   * 获取device
   */
  getDevice() {
    let device = sessionStorage.getItem('device')
    if (!this.isDefine(device) || device.length === 0) {
      device = this.uuid(32, 16)
      sessionStorage.setItem('device', device)
    }

    return device
  },
  /**
   * 存储登录返回的token,salt,pub
   *
   * @param token
   * @param salt
   * @param pub
   */
  saveData(token, salt, pub) {
    if (!this.isDefine(token) || !this.isDefine(salt) || !this.isDefine(pub)) {
      throw new Error('web-util/saveData: Data is empty')
    }

    const result = this.aesEncrypt(token + '|' + salt + '|' + pub, ap)

    sessionStorage.setItem('data', result)
  },
  /**
   * 清空数据
   */
  clearData() {
    sessionStorage.clear()
  },

  /**
   * 判断是否已经登录
   * @returns {boolean}
   */
  isLogin() {
    try {
      const data = this.getData()
      return this.isDefine(data.token);

    } catch(error) {
      console.error(error)
      return false
    }
  },

  /**
   * 读取token,salt,pub
   *
   * @returns {*}
   */
  getData() {
    const result = sessionStorage.getItem('data')
    if (!this.isDefine(result)) {
      return { token: '', salt: defaultSalt, pub: defaultPub }
    }
    const deResult = this.aesDecrypt(result, ap).split('|')

    return { token: this.aesDecrypt(deResult[0], ap), salt: this.aesDecrypt(deResult[1], ap), pub: this.aesDecrypt(deResult[2], ap) }
  },

  /**
   * 获取token
   * @returns {*}
   */
  getToken() {
    return this.getData().token
  },

  /**
   * 保存基本信息
   * @param baseInfo
   */
  saveBaseInfo(baseInfo) {
    const token = this.getToken('token')
    if (!this.isDefine(token)) {
      return
    }
    // console.log("token: ", token);
    const strBaseInfo = JSON.stringify(baseInfo)
    // console.log("strBaseInfo: ", strBaseInfo);
    const hexBaseInfo = this.aesEncrypt(strBaseInfo, token)
    // console.log("hexBaseInfo: ", hexBaseInfo);
    sessionStorage.removeItem('flash-ex-baseInfo')
    sessionStorage.setItem('flash-ex-baseInfo', hexBaseInfo)
  },

  /**
   * 获取基本信息
   * @returns {any}
   */
  getBaseInfo() {
    const token = this.getToken()
    if (!this.isDefine(token)) {
      return ''
    }
    // console.log("token: ", token);
    const str = sessionStorage.getItem('flash-ex-baseInfo')
    if (!str) {
      return ''
    }
    // console.log("str: ", str);
    const jsonStr = this.aesDecrypt(str, token)
    // console.log("jsonStr", jsonStr);
    return JSON.parse(jsonStr)
  },

  removeBaseInfo() {
    sessionStorage.removeItem('flash-ex-baseInfo')
  },

  /**
   * 随机生成UUID
   *
   * @param len    长度
   * @param radix  进制，例：10
   * @returns {string}
   */
  uuid(len, radix) {
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
  },

  /**
   * 根据参数对象组合生成请求参数字符串，例：type=adasdf&age=15
   *
   * @param params
   * @returns {string}
   */
  createParamStr(params) {
    const keys = Object.keys(params).sort()
    let str = ''
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      str += key + '=' + params[key] + '&'
    }

    if (str.length > 0) {
      str = str.substring(0, str.length - 1)
    }

    return str
  },

  /**
   * 根据参数对象生成签名，并封装成对象
   *
   * @param params
   * @returns {*|void}
   */
  createSign(params, token, salt) {
    const nonceSrc = params.nonceSrc
    const nonce = params.nonce
    delete params.nonceSrc
    delete params.nonce

    params.timestamp = new Date().getTime()
    params.token = token
    params.device = this.getDevice()

    const str = this.createParamStr(params)
    const sha256 = forge.md.sha256.create()
    sha256.update(str + nonceSrc + salt)
    params.sign = sha256.digest().toHex()
    params.nonce = nonce
    delete params.token

    return params
  },

  /**
   * 使用 AES-CBC 加密字符串，与 Java 实现保持一致
   *
   * @param {string} src - 要加密的原始字符串
   * @param {string} password - 用于生成加密密钥的密码
   * @return {string} 加密后的十六进制字符串
   */
  aesEncrypt(src, password) {
    // 1. 对密码进行 SHA-256 哈希，并取哈希值的后16位作为密钥
    const sha256 = forge.md.sha256.create()
    sha256.update(password)
    const hashedPassword = sha256.digest().toHex().substring(0, 16) // 取后16位

    // 2. 将密码转换为字节数组
    const key = forge.util.hexToBytes(forge.util.bytesToHex(forge.util.createBuffer(hashedPassword, 'utf8').bytes()))

    // 3. 使用固定的 IV（必须与 Java 中一致）
    const iv = forge.util.createBuffer("YhFBD6rmNjqE7CRB", 'utf8').bytes()

    // 4. 创建 AES 加密器并初始化 (CBC 模式)
    const cipher = forge.cipher.createCipher('AES-CBC', key)
    cipher.start({ iv: iv })

    // 5. 输入要加密的明文数据
    cipher.update(forge.util.createBuffer(src, 'utf8'))

    // 6. 完成加密
    cipher.finish()

    // 7. 获取加密后的数据并将其转换为十六进制字符串
    const encrypted = cipher.output

    // 返回加密结果（Java 中是十六进制表示）
    return forge.util.bytesToHex(encrypted.bytes())
  },

  /**
   * 使用 AES-CBC 解密加密的十六进制字符串，与 Java 实现保持一致
   *
   * @param {string} encryptedHex - 加密后的十六进制字符串
   * @param {string} password - 用于生成加密密钥的密码
   * @return {string} 解密后的明文字符串
   */
  aesDecrypt(encryptedHex, password) {
    // 1. 对密码进行 SHA-256 哈希，并取哈希值的前16位作为密钥（与加密时一致）
    const sha256 = forge.md.sha256.create()
    sha256.update(password)
    const hashedPassword = sha256.digest().toHex().substring(0, 16) // 取前16位

    // 2. 将密码转换为字节数组
    const key = forge.util.hexToBytes(forge.util.bytesToHex(forge.util.createBuffer(hashedPassword, 'utf8').bytes()))

    // 3. 使用固定的 IV（与加密时一致）
    const iv = forge.util.createBuffer("YhFBD6rmNjqE7CRB", 'utf8').bytes()

    // 4. 将加密的十六进制字符串转换为字节数组
    const encryptedBytes = forge.util.hexToBytes(encryptedHex)

    // 5. 创建 AES 解密器并初始化 (CBC 模式)
    const decipher = forge.cipher.createDecipher('AES-CBC', key)
    decipher.start({ iv: iv })

    // 6. 输入要解密的加密数据
    decipher.update(forge.util.createBuffer(encryptedBytes))

    // 7. 完成解密
    const success = decipher.finish()
    if (!success) {
      throw new Error('web-util/Decryption failed')
    }

    // 8. 获取解密后的数据并将其转换为字符串
    const decrypted = decipher.output.toString('utf8')

    return decrypted;
  },

  /**
   * 参数是否被定义
   */
  isDefine(para) {
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
  },

  /**
   * 获取rsa对象
   *
   * @param pub
   * @returns {NodeRSA}
   */
  getRsaKey(pub) {
    let publicKey
    if (!this.isDefine(pub)) {
      pub = '-----BEGIN PUBLIC KEY-----' + defaultPub + '-----END PUBLIC KEY-----'
    } else {
      pub = '-----BEGIN PUBLIC KEY-----' + pub + '-----END PUBLIC KEY-----'
    }

    publicKey = forge.pki.publicKeyFromPem(pub)

    return publicKey
  },
}

export default WebUtil

