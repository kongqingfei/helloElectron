const moment = require('moment')
const {screenWidth, screenHeight} = require('../config')
const {downloadFile} = require('../utils/util');
const log = require('../../utils/logUtil')

// 单文件下载 http://cdwp.cnbmxinyun.com/mkinvoicenew/exportexcel2?id=5fe562e292b417564e1a4e46
// 文件打包下载 http://cdwp.cnbmxinyun.com/mkinvoicenew/packagedownload?id=5fe562e292b417564e1a4e46,5fe562d2a4938ee57eb7b342
async function downloadInvoice (opts) {
  const {browser, page, invoiceArr, draftPath} = opts
  const start = Date.now();
  log.info(`----下载草稿excel自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/app/approval')
  await page.waitForSelector('#table > tbody > tr')
  await page.click("[ng-click=\"getData('mybegins')\"]")
  await page.waitForSelector('#table > tbody > tr')
  // 计算行号
  const rowIndex = await page.$$eval('#table > tbody > tr > td:nth-child(2)', (els) => {
    let index = -1
    els.forEach((el, ind) => {
      if (el.innerHTML === "开票申请(新) " && index === -1) {
        index = ind
        return false
      }
    })
    return index
  })
  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));    // 声明变量
  await page.click(`#table > tbody > tr:nth-child(${rowIndex + 1}) > td:nth-child(4) > a:nth-child(1)`)
  const pageDraft = await newPagePromise;           // newPage就是a链接打开窗口的Page对象
  await pageDraft.bringToFront()
  await pageDraft.setViewport({width: screenWidth, height: screenHeight});
  await pageDraft.waitForSelector(`table.orangestyle.table > tbody > tr.ng-scope`)
  // 从首页查找合同id号
  async function getFromFirstPage(invoiceArr) {
    // 合同号s
    const invoiceNos = await pageDraft.$$eval('table.orangestyle.table > tbody > tr.ng-scope > td:nth-child(7)', (els) => {
      const arr = []
      for(let i = 0; i < els.length; i++) {
        arr.push(els[i].innerHTML)
      }
      return arr;
    })
    // id号s
    const processIds = await pageDraft.$$eval('table.orangestyle.table > tbody > tr.ng-scope > td:nth-child(3) > a', (els) => {
      const arr = []
      for(let i = 0; i < els.length; i++) {
        arr.push(els[i].href.match(/processId=(.*?)&/)[1])
      }
      return arr;
    })
    invoiceNos.forEach((no, ind) => {
      const tempNo = no.split('-')[0]
      if (invoiceArr.includes(tempNo) && !successArr.includes(tempNo)) { // 只取最新的
        processIdArr.push(processIds[ind])
        successArr.push(tempNo)
      }
    })
  }
  // 通过搜索查找合同id号
  async function getFromSearch(invoiceArr) {
    for(let i = 0; i < invoiceArr.length; i++) {
      const invoiceNo = invoiceArr[i]
      await pageDraft.reload()
      await pageDraft.waitForSelector(`table.orangestyle.table > tbody > tr.ng-scope`)
      await pageDraft.type('.genSearch table tr td:nth-child(1) input[name=contractno]', invoiceNo)
      await pageDraft.click('.genSearch > .searchbtn2[ng-click="search()"]:nth-child(3)')
      await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
      await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
      await getFromFirstPage([invoiceNo])
    }
  }
  const successArr = []
  const errorArr = []
  let notFoundArr = []
  const processIdArr = []
  let filename = ""
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  await getFromFirstPage(invoiceArr)
  async function doDownload() {
    if (processIdArr.length === 0) {
      return
    }
    filename = `${draftPath}\\发票清单${moment().format('YYYY-MM-DD_HH-mm-ss')}.zip`
    log.info(`文件开始下载：http://cdwp.cnbmxinyun.com/mkinvoicenew/packagedownload?id=${encodeURIComponent(processIdArr.join(','))}`)
    await downloadFile(`http://cdwp.cnbmxinyun.com/mkinvoicenew/packagedownload?id=${encodeURIComponent(processIdArr.join(','))}`, filename)
    log.info(`文件下载成功：${filename}`)
  }
  if (invoiceArr.length === processIdArr.length) { // 首页已找齐
    await doDownload()
  } else  { // 首页未找齐，需要查询补充
    await getFromSearch(invoiceArr.reduce((prev, cur) => {
      if (!successArr.includes(cur) && !errorArr.includes(cur)) {
        prev.push(cur);
      }
      return prev;
    }, []))
    await doDownload()
  }
  log.info(`----下载草稿excel自动化任务结束----总耗时${Date.now() - start}----`)
  log.info(`全部合同：${JSON.stringify(invoiceArr)}`)
  log.info(`成功合同：${JSON.stringify(successArr)}`)
  log.info(`失败合同：${JSON.stringify(errorArr)}`)
  notFoundArr = invoiceArr.reduce((prev, cur) => {
    if (!successArr.includes(cur) && !errorArr.includes(cur)) {
      prev.push(cur);
    }
    return prev;
  }, [])
  log.info(`未找到合同：${JSON.stringify(notFoundArr)}`)
  await pageDraft.close()
  return {invoiceArr, successArr, errorArr, notFoundArr, filename}
}

module.exports = {
  downloadInvoice
}