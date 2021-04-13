const {screenWidth, screenHeight} = require('./config')
const {getErrorMsg} = require('./utils/util');
const log = require('../utils/logUtil')
const os = require('os')

async function makeInvoice(opts) {
  const {browser, page, invoiceArr} = opts
  const start = Date.now();
  log.info(`----做发票草稿自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/hold/contractOrder');
  async function submitOne(invoiceNo) {
    log.info(`----${invoiceNo}合同处理开始----`)
    let taxStr, pageInvoice;
    // 查合同跳转开票页
    await page.reload()
    await page.waitForSelector('input[ng-model=contractno]')
    await page.type('input[ng-model=contractno]', invoiceNo);
    await page.click('input.searchbtn2[ng-click="search()"]')
    await page.waitForSelector('.ui-grid-canvas')
    // 计算行号
    const rowIndex = await page.$$eval('.ui-grid-coluiGrid-0004 > .ui-grid-cell-contents > a', (els, invoiceNo) => {
      let index = -1
      els.forEach((el, ind) => {
        if (el.innerHTML.split('-')[0] === invoiceNo && index === -1) {
          index = ind
          return false
        }
      })
      return index
    }, invoiceNo)
    taxStr = await page.$eval(`.ui-grid-row:nth-child(${rowIndex + 1}) .ui-grid-coluiGrid-000B.ui-grid-cell .ui-grid-cell-contents`, el => el.innerHTML);
    await page.waitForSelector(`.ui-grid-canvas .ui-grid-row:nth-child(${rowIndex + 1}) a[title="开票"]`)
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));    // 声明变量
    await page.click(`.ui-grid-canvas .ui-grid-row:nth-child(${rowIndex + 1}) a[title="开票"]`)
    pageInvoice = await newPagePromise;           // newPage就是a链接打开窗口的Page对象
    await pageInvoice.bringToFront()
    try {
      await pageInvoice.setViewport({width: screenWidth, height: screenHeight});
      // 开票页操作的提交
      await pageInvoice.waitForSelector('select[name=ZFPLX]')
      await pageInvoice.waitForSelector('select[name=ZFPLX] option[value="string:FP31"]')
      if (taxStr === '税率13%') {
        await pageInvoice.select('select[name=ZFPLX]', 'string:FP31'); // 单选择器
      } else if (taxStr === '税率6%') {
        await pageInvoice.select('select[name=ZFPLX]', 'string:FP7'); // 单选择器
      }
      await pageInvoice.waitForSelector('a.hBtn')
      await pageInvoice.click('a.hBtn')
      async function afterHBtn() {
        async function afterVBELNSelect() {
          await pageInvoice.waitForFunction(selector => document.querySelectorAll(selector).length > 1, {}, '.addTable > table > tbody')
          await pageInvoice.click('.addTable > table > tbody:nth-child(1) input[type=checkbox]')
          await pageInvoice.click('form[name=invoiceForm] .gerSub .subSave')
          await pageInvoice.waitForSelector('select[ng-model="sdef.isfpandxsht"]')
          await pageInvoice.select('select[ng-model="sdef.isfpandxsht"]', '是'); // 单选择器
          await pageInvoice.click('form[name=mkinvoiceForm] > .gerSub .subSave')
          async function dealResult() { // 处理最后的结果，弹窗可能会弹多个
            await pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
            await pageInvoice.waitForFunction(selector => document.querySelector(selector).innerHTML !== 'Title', {}, '.sweet-alert > h2');
            const successDisplay = await pageInvoice.$eval('.sweet-alert > .sa-success', el => el.style.display);
            const dialogTxt = await pageInvoice.$eval('.sweet-alert > h2', el => el.innerHTML);
            if (successDisplay === 'block') {
              // 关闭页面
              log.info(`----${invoiceNo}合同处理成功----${dialogTxt}----`)
              successArr.push(invoiceNo)
            } else if (dialogTxt.includes('存在含税金额为负数的行项目，请调整申请实际开票金额=0后提交')) {
              await pageInvoice.waitFor(1000);
              await pageInvoice.click('.sweet-alert > .sa-button-container > .sa-confirm-button-container > .confirm')
              await pageInvoice.waitForSelector('[name="real_amount"]')
              await pageInvoice.focus('[name="real_amount"]')
              if (os.type() === 'Darwin') { // mac系统
                for (let i = 0; i < 30; i++) {
                  await pageInvoice.keyboard.down('ArrowRight')
                }
                for (let i = 0; i < 30; i++) {
                  await pageInvoice.keyboard.down('Backspace')
                }
              } else {
                await pageInvoice.keyboard.down('Control')
                await pageInvoice.keyboard.press('a')
                await pageInvoice.keyboard.up('Control')
                await pageInvoice.keyboard.press('Backspace')
              }
              await pageInvoice.type('[name="real_amount"]', "0")
              await pageInvoice.click('form[name=mkinvoiceForm] > .gerSub .subSave')
              await dealResult()
            } else if (dialogTxt.includes('请推送') || dialogTxt.includes('请删除')) {
              await pageInvoice.waitFor(1000);
              await pageInvoice.click('.sweet-alert > .sa-button-container > .sa-confirm-button-container > .confirm')
              await pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
              await pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
              await dealResult()
            } else {
              log.error(`----${invoiceNo}合同处理失败----${dialogTxt}----`)
              errorArr.push(invoiceNo)
            }
          }
          await dealResult()
        }
        await pageInvoice.waitForSelector('a[ng-click="VBELNSelect(recode)"]')
        await pageInvoice.click('a[ng-click="VBELNSelect(recode)"]')
        await Promise.race([
          pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert'),
          pageInvoice.waitForFunction(selector => document.querySelectorAll(selector).length > 1, {}, '.addTable > table > tbody'),
        ])
        if (await pageInvoice.$eval('.sweet-alert', el => el.style.display === 'block')) { // 失败
          await pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert > .sa-warning');
          const errMsgVBELNSelect = await getErrorMsg(pageInvoice)
          if (/销售订单1000\d+存在项目费用物料未放货，请完全处理后再开票。/g.test(errMsgVBELNSelect)) {
            orderArr.push(errMsgVBELNSelect.match(/(\d+)/g)[0])
          }
          log.error(`----${invoiceNo}合同处理失败----${errMsgVBELNSelect}----`)
          errorArr.push(invoiceNo)
        } else {
          await afterVBELNSelect()
        }
      }
      await Promise.race([
        pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert'),
        pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#contNum'),
      ])
      const hBtnRet = await pageInvoice.$eval('#contNum', el => el.style.display === 'block')
      if (hBtnRet) { // 成功
        await afterHBtn();
      } else {
        await pageInvoice.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert > .sa-warning');
        log.error(`----${invoiceNo}合同处理失败----${await getErrorMsg(pageInvoice)}----`)
        errorArr.push(invoiceNo)
      }
    } catch(e) {
      // 操作完成关闭当前页
      await pageInvoice.close();
      await page.bringToFront()
      throw e
    }
    // 操作完成关闭当前页
    await pageInvoice.close();
    await page.bringToFront()
  }
  const successArr = []
  const errorArr = []
  const waitArr = []
  const orderArr = []
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  for(let i = 0; i < invoiceArr.length; i++) {
    try {
      await submitOne(invoiceArr[i])
    } catch(e) {
      log.error(e.stack);
      log.error(`----${invoiceArr[i]}合同处理失败----未知异常----`)
      waitArr.push(invoiceArr[i])
    }
  }
  // 失败重试一次
  log.info(`异常合同重试：${JSON.stringify(waitArr)}`)
  let tempArr = waitArr
  let prevArr, prevLen
  do {
    prevArr = tempArr
    prevLen = prevArr.length
    tempArr = []
    for(let i = 0; i < prevArr.length; i++) {
      try {
        await submitOne(prevArr[i])
      } catch(e) {
        log.error(e.stack);
        log.error(`----${prevArr[i]}合同处理失败----未知异常----`)
        tempArr.push(prevArr[i])
      }
    }
  } while(tempArr.length < prevLen)
  tempArr.forEach((item) => {
    errorArr.push(item)
  })
  log.info(`----做发票草稿自动化任务结束----总耗时${Date.now() - start}----`)
  log.info(`全部合同：${JSON.stringify(invoiceArr)}，共${invoiceArr.length}个`)
  log.info(`成功合同：${JSON.stringify(successArr)}，共${successArr.length}个`)
  log.info(`失败合同：${JSON.stringify(errorArr)}，共${errorArr.length}个`)
  return {invoiceArr, successArr, errorArr, orderArr}
}

module.exports = {
  makeInvoice
}