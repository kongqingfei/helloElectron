const puppeteerUtil = require('./utils/puppeteerUtil')

async function init() {
  await puppeteerUtil.login({name: 'zhaorun', password: 'zhaorun222', headless: false})
  await puppeteerUtil.submitContract({invoiceArr: ['SOA2021003157']})
  // await puppeteerUtil.submitInvoice({invoiceArr: ['SOA2020021289']})
}

init().then((res) => {

})
