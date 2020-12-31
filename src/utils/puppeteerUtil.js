const {createPage, login} = require('../puppeteer/common/common')
const {makeInvoice} = require('../puppeteer/index')
const {downloadInvoice} = require('../puppeteer/business/download')

const ext = {
  browser: null,
  page: null,
  isLogin: false,
  init: (headless=true) => {
    createPage({headless}).then((res) => {
      ext.browser = res.browser
      ext.browser.on('disconnected', () => { // 被关闭了立马重新生成browser
        ext.init(headless)
      })
      ext.page = res.page
    })
  },
  login: async (name, password) => {
    if (!ext.isLogin) {
      ext.isLogin = await login(ext.page, name, password) ? true : false
    }
    return ext.isLogin
  },
  makeInvoice: async (opts) => {
    return await makeInvoice({
      browser: ext.browser,
      page: ext.page,
      ...opts,
    })
  },
  downloadInvoice: async (opts) => {
    return await downloadInvoice({
      browser: ext.browser,
      page: ext.page,
      ...opts,
    })
  }
}

module.exports = ext;
