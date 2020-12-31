const {createPage, login} = require('../puppeteer/common/common')
const {makeInvoice} = require('../puppeteer/index')
const {downloadInvoice} = require('../puppeteer/business/download')

const ext = {
  browser: null,
  page: null,
  isLogin: false,
  init: async (opts) => {
    const {browser, page} = await createPage(opts)
    ext.browser = browser
    ext.browser.on('disconnected', async () => { // 被关闭了立马重新生成browser
      await ext.init(headless)
    })
    ext.page = page
  },
  login: async (opts) => {
    const {name, password} = opts
    if (!ext.page) {
      await ext.init(opts)
    }
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
