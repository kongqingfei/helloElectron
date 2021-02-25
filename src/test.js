const puppeteerUtil = require('./utils/puppeteerUtil')

async function init() {
  await puppeteerUtil.login({name: 'zhaorun', password: 'zhaorun666', headless: false})
  // await puppeteerUtil.makeInvoice({invoiceArr: ['SOA2021002628']})
  await puppeteerUtil.submitInvoice({invoiceArr: ['SOA2021000665'], realAmount0: false})
}

init().then((res) => {

})
