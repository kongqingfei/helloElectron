const { screenWidth, screenHeight } = require('../config')
const log = require('../../utils/logUtil')
const os = require('os')

async function submitInvoice(opts) {
  const { browser, page, invoiceArr, realAmount0=false } = opts
  const start = Date.now();
  log.info(`----提交审批自动化任务开始----`)
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
  await pageDraft.setViewport({ width: screenWidth, height: screenHeight });
  await pageDraft.waitForSelector(`table.orangestyle.table > tbody > tr.ng-scope`)

  async function submitOne(href, invoiceNo) {
    log.info(`----${invoiceNo}合同处理开始----`)
    const pageOne = await browser.newPage()
    await pageOne.bringToFront()
    await pageOne.setViewport({ width: screenWidth, height: screenHeight });
    await pageOne.goto(href)
    await pageOne.waitForSelector('[ng-show="ht.activeTab == 1"].viewTable > ul > li:nth-child(1) > span')
    await pageOne.waitForFunction(selector => document.querySelector(selector).innerHTML ? true : false, {}, '[ng-show="ht.activeTab == 1"].viewTable > ul > li:nth-child(1) > span')
    await pageOne.click('[ng-if="editBtn"]')
    await pageOne.waitForSelector('[ng-model="sdef.XBLNR"]')
    await pageOne.waitForFunction(selector => document.querySelector(selector).value ? true : false, {}, '[ng-model="sdef.XBLNR"]');
    await pageOne.waitForSelector('[ng-repeat="jhdmxArrlist in jhdmxArr"] > tbody > tr')
    // todo
    if (realAmount0) { // 将申请实际开票金额改为0
      await pageOne.waitForSelector('[name="real_amount"]')
      await pageOne.focus('[name="real_amount"]')
      if (os.type() === 'Darwin') { // mac系统
        for (let i = 0; i < 30; i++) {
          await pageOne.keyboard.down('ArrowRight')
        }
        for (let i = 0; i < 30; i++) {
          await pageOne.keyboard.down('Backspace')
        }
      } else {
        await pageOne.keyboard.down('Control')
        await pageOne.keyboard.press('a')
        await pageOne.keyboard.up('Control')
        await pageOne.keyboard.press('Backspace')
      }
      await pageOne.type('[name="real_amount"]', "0")
    }
    // 点一下刷新
    await pageOne.waitForSelector('a[ng-click="refresh()"]')
    await pageOne.click('a[ng-click="refresh()"]')
    await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
    await pageOne.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');

    await pageOne.waitForSelector('.subApply')
    let counter = 10 // 最多循环10次

    await pageOne.waitFor(1000);
    await pageOne.click('.subApply')
    async function dealResult() {
      if (counter <= 0) {
        return
      }
      counter--
      await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
      await pageOne.waitForFunction(selector => document.querySelector(selector).innerHTML !== 'Title', {}, '.sweet-alert > h2');
      const successDisplay = await pageOne.$eval('.sweet-alert > .sa-success', el => el.style.display);
      const dialogTxt = await pageOne.$eval('.sweet-alert > h2', el => el.innerHTML);
      if (successDisplay === 'block') {
        log.info(`----${invoiceNo}合同处理成功----${dialogTxt}----`)
        successArr.push(invoiceNo)
      } else if (dialogTxt.includes('请推送') || dialogTxt.includes('请删除')) {
        await pageOne.waitFor(1000);
        await pageOne.click('.sweet-alert > .sa-button-container > .sa-confirm-button-container > .confirm')
        await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
        await pageOne.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
        await dealResult()
      } else {
        if (['系统处理中', '请1秒后再点击'].includes(dialogTxt)) {
          log.info(`----${invoiceNo}合同处理失败----${dialogTxt}----1秒后重试----`)
          await pageOne.click('.sweet-alert > .sa-button-container > .sa-confirm-button-container > .confirm')
          await pageOne.waitFor(1000)
          await pageOne.click('.subApply')
          await dealResult()
        } else {
          log.error(`----${invoiceNo}合同处理失败----${dialogTxt}----`)
          errorArr.push(invoiceNo)
        }
      }
    }
    await dealResult()
    // 关闭页面
    await pageOne.close()
  }

  // 从首页查找合同id号
  async function getFromFirstPage(invoiceArr, onlyDel) {
    // 合同号s
    const invoiceNos = await pageDraft.$$eval('table.orangestyle.table > tbody > tr.ng-scope > td:nth-child(7)', (els) => {
      const arr = []
      for (let i = 0; i < els.length; i++) {
        arr.push(els[i].innerHTML)
      }
      return arr;
    })
    for (let ind = 0; ind < invoiceNos.length; ind++) {
      const no = invoiceNos[ind]
      const tempNo = no.split('-')[0]
      if (invoiceArr.includes(tempNo) && !successArr.includes(tempNo) && !onlyDel) { // 只取最新的
        const href = await pageDraft.$eval(`table.orangestyle.table > tbody > tr.ng-scope:nth-child(${ind + 1}) > td:nth-child(3) > a`, (el) => {
          return el.href;
        })
        await pageDraft.waitFor(1000)
        await submitOne(href, tempNo)
        await pageDraft.bringToFront()
      } else if (ind > 0 && invoiceArr.includes(tempNo)) { // 删除多余发票
        log.info(`----${tempNo}存在多余草稿，开始删除----`)
        await pageDraft.click(`table.orangestyle.table > tbody > tr.ng-scope:nth-child(${ind + 1}) .delBtn`)
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
        await pageDraft.waitFor(1000);
        await pageDraft.click('.sweet-alert button.confirm')
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
        const successDisplay = await pageDraft.$eval('.sweet-alert > .sa-success', el => el.style.display);
        const dialogTxt = await pageDraft.$eval('.sweet-alert > h2', el => el.innerHTML);
        if (successDisplay === 'block') {
          // 关闭页面
          log.info(`----${tempNo}多余草稿删除成功----${dialogTxt}----`)
        } else {
          log.error(`----${tempNo}多余草稿删除失败----${dialogTxt}----`)
        }
        log.info(`----${tempNo}多余草稿删除结束----`)
      }
    }
  }
  // 通过搜索查找合同id号
  async function getFromSearch(invoiceArr) {
    for (let i = 0; i < invoiceArr.length; i++) {
      const invoiceNo = invoiceArr[i].split('-')[0]
      try {
        await pageDraft.reload()
        await pageDraft.waitForSelector(`table.orangestyle.table > tbody > tr.ng-scope`)
        await pageDraft.type('.genSearch table tr td:nth-child(1) input[name=contractno]', invoiceNo)
        await pageDraft.click('.genSearch > .searchbtn2[ng-click="search()"]:nth-child(3)')
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
        await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
        await getFromFirstPage([invoiceNo])
      } catch(e) {
        log.error(e.stack);
        log.error(`----${invoiceNo}合同处理失败----未知异常----`)
        errorArr.push(invoiceNo)
      }
      // 根据合同id，重新查询当前列表，删除多余合同
      try {
        await getFromFirstPage([invoiceNo], true)
      } catch(e) {
        log.error(e.stack);
        log.error(`----${invoiceNo}多余合同删除失败----未知异常----`)
      }
    }
  }
  const successArr = []
  let errorArr = []
  let notFoundArr = []
  let filename = ""
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  await getFromSearch(invoiceArr)

  // 失败重试一次
  log.info(`异常合同重试：${JSON.stringify(errorArr)}`)
  let prevArr, prevLen
  do {
    prevArr = errorArr
    prevLen = prevArr.length
    errorArr = []
    await getFromSearch(prevArr)
  } while(errorArr.length < prevLen)

  log.info(`----提交审批自动化任务结束----总耗时${Date.now() - start}----`)
  log.info(`全部合同：${JSON.stringify(invoiceArr)}`)
  log.info(`成功合同：${JSON.stringify(successArr)}`)
  log.info(`失败合同：${JSON.stringify(errorArr)}`)
  notFoundArr = invoiceArr.reduce((prev, cur) => {
    const tempCur = cur.split('-')[0]
    if (!successArr.includes(tempCur) && !errorArr.includes(tempCur)) {
      prev.push(tempCur);
    }
    return prev;
  }, [])
  log.info(`未找到合同：${JSON.stringify(notFoundArr)}`)
  await pageDraft.close()
  return { invoiceArr, successArr, errorArr, notFoundArr, filename }
}

module.exports = {
  submitInvoice
}