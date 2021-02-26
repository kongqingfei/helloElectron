const puppeteerUtil = require('./utils/puppeteerUtil')

async function init() {
  await puppeteerUtil.login({name: 'zhaorun', password: 'zhaorun666', headless: false})
  // await puppeteerUtil.makeInvoice({invoiceArr: ['SOA2021000084']})
  // await puppeteerUtil.submitInvoice({invoiceArr: ['SOA2021000084'], realAmount0: false})
  await puppeteerUtil.submitContract({invoiceArr: ['SOA2021002904-V001']})
}

init().then((res) => {

})
