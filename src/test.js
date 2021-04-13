const fs = require('fs')
const puppeteerUtil = require('./utils/puppeteerUtil')

async function init() {
  await puppeteerUtil.login({name: 'zhaorun', password: 'zhaorun612', headless: false, chromePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  await puppeteerUtil.makeInvoice({invoiceArr: ['SOA2021006202']})
  // await puppeteerUtil.submitInvoice({invoiceArr: ['SOA2021000084'], realAmount0: false})
  // await puppeteerUtil.submitContract({invoiceArr: ['SOA2021002904-V001']})
  // await puppeteerUtil.uploadContract({invoiceArr: ['SOA2020032428-V001'], contractPath: 'C:\\Users\\20720\\Desktop'})
  // console.log(fs.existsSync('C:\\Users\\20720\\Desktop\\销售_SOA2021004481_合同.pdf'))
  // console.log(fs.existsSync('C:\\Users\\20720\\Desktop\\销售_SOA2021004481_合同111.pdf'))
}

init().then((res) => {

})
