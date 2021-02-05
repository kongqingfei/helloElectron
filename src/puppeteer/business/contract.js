const {screenWidth, screenHeight} = require('../config')
const log = require('../../utils/logUtil')

async function submitContract(opts) {
  const {browser, page, invoiceArr, nextPerson='王丽娟'} = opts
  const start = Date.now();
  log.info(`----提交销售合同自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/app/approval')
  await page.waitForSelector('#table > tbody > tr')
  // 计算行号
  const rowIndex = await page.$$eval('#table > tbody > tr > td:nth-child(2)', (els) => {
    let index = -1
    els.forEach((el, ind) => {
      if (el.innerHTML === "销售合同 " && index === -1) {
        index = ind
        return false
      }
    })
    return index
  })
  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));    // 声明变量
  await page.click(`#table > tbody > tr:nth-child(${rowIndex + 1}) > td:nth-child(4) > a:nth-child(1)`)
  const pageContract = await newPagePromise;           // newPage就是a链接打开窗口的Page对象
  await pageContract.bringToFront()
  await pageContract.setViewport({width: screenWidth, height: screenHeight});
  await pageContract.waitForSelector(`.ui-grid-canvas > .ui-grid-row .ui-grid-coluiGrid-0005`)
  // .ui-grid-canvas > .ui-grid-row:nth-child(1) .ui-grid-coluiGrid-0005

  // 提交单个合同
  async function submitOne(href, invoiceNo) {
    log.info(`----${invoiceNo}合同处理开始----`)
    const pageOne = await browser.newPage()
    await pageOne.bringToFront()
    await pageOne.setViewport({width: screenWidth, height: screenHeight});
    await pageOne.goto(href)
    await pageOne.waitForSelector(`select[ng-model="ORDER_DATA.contractbase.receivabletype"]`)
    const projectName = await pageOne.$eval('[ng-show="ht.activeTab == 1"] > .viewTable > ul:nth-child(2) > li:nth-child(10) > span', (el) => {
      return el.innerHTML
    })
    if (projectName === '分销') {
      await pageOne.select('select[ng-model="ORDER_DATA.contractbase.receivabletype"]', '固定模式'); // 单选择器
    } else if (projectName === '项目') {
      await pageOne.select('select[ng-model="ORDER_DATA.contractbase.receivabletype"]', '修改模式'); // 单选择器
    } else { // 不属于分销和项目类型
      log.error(`----${invoiceNo}合同处理失败----合同类型是${projectName}，不是分销和项目----`)
      errorArr.push(invoiceNo)
      return
    }
    await pageOne.click('[ng-model="ORDER_DATA.contractbase.effectdate"]')
    await pageOne.waitForSelector(`[lang="zh-cn"]`)
    await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '[lang="zh-cn"]');
    const elementHandle = await pageOne.$('iframe');
    const frame = await elementHandle.contentFrame();
    await frame.waitForSelector('#dpTodayInput');
    await frame.click('#dpTodayInput')
    await pageOne.waitForSelector('.danger[ng-if="agreeBtn"]')
    await pageOne.click('.danger[ng-if="agreeBtn"]')
    await pageOne.waitForSelector('select[ng-model="nextApply"]')
    await pageOne.waitForSelector('select[ng-model="nextApply"] option[value="2"]')
    await pageOne.select('select[ng-model="nextApply"]', "2"); // 单选择器
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
    } else {
      log.error(`----${invoiceNo}合同处理失败----${dialogTxt}----`)
      errorArr.push(invoiceNo)
    }
    // todo 成功之后关闭页面
    await pageOne.close()
  }

  // 从首页查找合同id号
  async function getFromFirstPage(invoiceArr) {
    // 合同号
    const invoiceNos = await pageContract.$$eval('.ui-grid-canvas > .ui-grid-row .ui-grid-coluiGrid-0005 > .ui-grid-cell-contents > a', (els) => {
      const arr = []
      for(let i = 0; i < els.length; i++) {
        arr.push(els[i].innerHTML)
      }
      return arr;
    })
    for(let ind = 0; ind < invoiceNos.length; ind++) {
      const no = invoiceNos[ind]
      const tempNo = no.split('-')[0]
      if (invoiceArr.includes(tempNo) && !successArr.includes(tempNo)) { // 只取最新的
        const href = await pageContract.$eval('.ui-grid-canvas > .ui-grid-row:nth-child(' + (ind + 1) + ') .ui-grid-coluiGrid-0005 > .ui-grid-cell-contents > a', (el) => {
          return el.href
        })
        await submitOne(href, tempNo)
        await pageContract.bringToFront()
      }
    }
  }
  // 通过搜索查找合同id号
  async function getFromSearch(invoiceArr) {
    for(let i = 0; i < invoiceArr.length; i++) {
      const invoiceNo = invoiceArr[i]
      await pageContract.reload()
      await pageContract.waitForSelector('.genSearch table tr td:nth-child(1) input[ng-model="$parent.filter.key"]')
      await pageContract.type('.genSearch table tr td:nth-child(1) input[ng-model="$parent.filter.key"]', invoiceNo)
      await pageContract.click('.genSearch table tr td:nth-child(1) .searchbtn2')
      await pageContract.waitForSelector(`[role="dialog"] .ui-grid-canvas .ui-grid-coluiGrid-0005 .ui-grid-cell-contents a`)
      const href = await pageContract.$eval('[role="dialog"] .ui-grid-canvas .ui-grid-coluiGrid-0005 .ui-grid-cell-contents a', (el) => {
        return el.href
      })
      await submitOne(href, invoiceNo)
      await pageContract.bringToFront()
      await pageContract.click('[role="dialog"] [title="Close"]')
    }
  }
  const successArr = []
  const errorArr = []
  let notFoundArr = []
  const processIdArr = []
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  await getFromFirstPage(invoiceArr)
  if (successArr.length < invoiceArr.length) { // 首页未找齐，需要查询补充
    await getFromSearch(invoiceArr.reduce((prev, cur) => {
      if (!successArr.includes(cur) && !errorArr.includes(cur)) {
        prev.push(cur);
      }
      return prev;
    }, []))
  }
  log.info(`----提交销售合同自动化任务结束----总耗时${Date.now() - start}----`)
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
  return {invoiceArr, successArr, errorArr, notFoundArr}
}

module.exports = {
  submitContract
}