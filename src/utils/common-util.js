const util = {
  numFormat (number, decimals, roundtag) {
    number = (number + '').replace(/[^0-9+-Ee.]/g, '')
    roundtag = roundtag || 'ceil' // "ceil","floor","round"
    var n = !isFinite(+number) ? 0 : +number
    var prec = !isFinite(+decimals) ? 0 : Math.abs(decimals)
    var sep = ','
    var dec = '.'
    var s = ''
    var toFixedFix = function (n, prec) {
      var k = Math.pow(10, prec) 

      return '' + parseFloat(Math[roundtag](parseFloat((n * k).toFixed(prec * 2))).toFixed(prec * 2)) / k
    }
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.')
    var re = /(-?\d+)(\d{3})/
    while (re.test(s[0])) {
      s[0] = s[0].replace(re, '$1' + sep + '$2')
    }

    if ((s[1] || '').length < prec) {
      s[1] = s[1] || ''
      s[1] += new Array(prec - s[1].length + 1).join('0')
    }
    return s.join(dec)
  },
  numFormat6Floor (number) {
    if(!number) return 0
    return this.numFormat(number, 6, 'floor')
  },
  numFormat4Floor (number) {
    if(!number) return 0
    return this.numFormat(number, 4, 'floor')
  },

  numFormat2Floor (number) {
    return this.numFormat(number, 2, 'floor')
  },

  numFormatBase (number) {
    return this.numFormat(number, 0)
  },

  timestampToDate (time) {
    const date = new Date(time * 1000)
    const Y = date.getFullYear()
    const M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1)
    const D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
    const h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':'
    const m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':'
    const s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()

    return { year: Y, month: M, day: D, time: h + m + s }
  },

  showTime (time) {
    if (time - 0 <= 0) {
      return '-'
    }
    const t = this.timestampToDate(time)
    return t.year + '-' + t.month + '-' + t.day + ' ' + t.time
  },

  showAmount(amount, decimals) {
    if (this.isDefine(decimals)) {
      return this.numFormat(amount, decimals, 'floor')
    }

    return this.numFormat4Floor(amount)
  },

  isAmount(amount) {
    return /^((0\.0*[1-9]+[0-9]*)|([1-9]+[0-9]*\.[0-9]*[0-9])|([1-9]+[0-9]*))$/.test(amount)
  },

  isDefine (para) {
    return !(typeof para === 'undefined' || para === '' || para == null);
  },

  omitAddress (address, length) {
    if (address) {
      const l = address.length

      if (l <= length || length === 0) {
        return address
      }

      const lastLength = (length - 2) / 2
      const firstLength = length - lastLength

      return address.substring(0, firstLength) + '...' + address.substring(l - lastLength)
    }

  },
  formatNumberWithCommas(number) {
    // 将数字转换为字符串
    let numberString = number.toString();
    
    // 使用正则表达式进行格式化
    let formattedNumber = numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return formattedNumber;
    }
}

export default util

