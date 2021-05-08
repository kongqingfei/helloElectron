const { screenWidth, screenHeight } = require('../config')
const log = require('../../utils/logUtil')

async function submitCost(opts) {
  const { browser, page, invoiceArr } = opts
  const start = Date.now();
  log.info(`----自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/app/approval')
  await page.waitForSelector('#table > tbody > tr')
  // 计算行号
  const rowIndex = await page.$$eval('#table > tbody > tr > td:nth-child(2)', (els) => {
    let index = -1
    els.forEach((el, ind) => {
      if (el.innerHTML === "成本分析变更 " && index === -1) {
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

  async function submitOne(href) {
      const pageOne = await browser.newPage()
      await pageOne.bringToFront()
      await pageOne.setViewport({ width: screenWidth, height: screenHeight });
      await pageOne.goto(href)
      await pageOne.waitForSelector('.applyLogTable tbody tr:nth-child(1) td:nth-child(6)')
      const invoiceNo = await pageOne.$eval('.generForm > [name=myForm] > .addTable tbody tr td:nth-child(1)', (el) => el.innerHTML)
      log.info(`----${invoiceNo}合同处理开始----`)
    const innerHt = await pageOne.$eval('.applyLogTable tbody tr:nth-child(1) td:nth-child(6)', (el) => {
        return el.innerHTML;
    })
    if (innerHt.endsWith('取消A类服务')) {
        await pageOne.waitForSelector('.danger[ng-if="agreeBtn"]')
        await pageOne.click('.danger[ng-if="agreeBtn"]')
        await pageOne.waitForSelector('select[ng-model="nextApply"]')
        await pageOne.waitForSelector('select[ng-model="nextApply"] option[value="3"]')
        await pageOne.select('select[ng-model="nextApply"]', "3"); // 单选择器
        await pageOne.click('button[ng-click="applyFn(nextApply,CNBM_MULTI.corp)"]')
        // todo 成功的判断
        await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
        await pageOne.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
        await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
        await pageOne.waitForFunction(selector => document.querySelector(selector).innerHTML !== 'Title', {}, '.sweet-alert > h2');
        const successDisplay = await pageOne.$eval('.sweet-alert > .sa-success', el => el.style.display);
        const dialogTxt = await pageOne.$eval('.sweet-alert > h2', el => el.innerHTML);
        if (successDisplay === 'block') {
            // 关闭页面
            log.info(`----${invoiceNo}合同处理成功----${dialogTxt}----`)
            successArr.push(invoiceNo)
            // 关闭页面
            await pageOne.close()
            return true
        } else {
            log.error(`----${invoiceNo}合同处理失败----${dialogTxt}----`)
            errorArr.push(invoiceNo)
        }
    } else {
        log.error(`----${invoiceNo}合同处理失败(不符合指定内容)--------`)
        errorArr.push(invoiceNo)
    }
    return false
  }

  // 从首页查找合同id号
  async function getFromFirstPage() {
    await pageDraft.reload();
    await pageDraft.waitForSelector('table.orangestyle.table > tbody > tr.ng-scope > td:nth-child(2) > a')
    const href = await pageDraft.$eval('table.orangestyle.table > tbody > tr.ng-scope > td:nth-child(2) > a', (el) => {
        return el.href;
    })
    await pageDraft.waitFor(1000)
    const ret = await submitOne(href)
    if (ret) {
        await pageDraft.bringToFront()
        await getFromFirstPage()
    }
  }
  // 通过搜索查找合同id号
  async function getFromSearch(invoiceArr) {
    for (let i = 0; i < invoiceArr.length; i++) {
      const invoiceNo = invoiceArr[i].split('-')[0]
      await pageDraft.reload()
      await pageDraft.waitForSelector(`table.orangestyle.table > tbody > tr.ng-scope`)
      await pageDraft.type('.genSearch table tr td:nth-child(1) input[name=contractno]', invoiceNo)
      await pageDraft.click('.genSearch > .searchbtn2[ng-click="search()"]:nth-child(3)')
      await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '#loading');
      await pageDraft.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '#loading');
      await getFromFirstPage([invoiceNo])
      // 根据合同id，重新查询当前列表，删除多余合同
      await getFromFirstPage([invoiceNo], true)
    }
  }
  const successArr = []
  const errorArr = []
  let notFoundArr = []
  let filename = ""
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  await getFromFirstPage(invoiceArr)
  log.info(`----自动化任务结束----总耗时${Date.now() - start}----`)
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
    submitCost
}