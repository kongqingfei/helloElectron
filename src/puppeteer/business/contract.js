const {screenWidth, screenHeight} = require('../config')
const fs = require('fs');
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
    await pageOne.waitForSelector(`.generNav > li`)
    const firstCls = await pageOne.$eval('.generNav > li', (el) => {
      return el.className
    })
    if (firstCls === 'active') { // 在订单信息标签页，需要设置项目类型和日期
      const pageTitle = await pageOne.$eval('#pageTitle', (el) => el.innerHTML)
      if (pageTitle !== '销售合同内容变更-审批详情') {
        await pageOne.waitForSelector(`select[ng-model="ORDER_DATA.contractbase.receivabletype"]`)
        const projectName = await pageOne.$eval('[ng-show="ht.activeTab == 1"] > .viewTable > ul:nth-child(2) > li:nth-child(10) > span', (el) => {
          return el.innerHTML
        })
        if (projectName === '分销') {
          await pageOne.select('select[ng-model="ORDER_DATA.contractbase.receivabletype"]', '固定模式'); // 单选择器
        } else { // 非分销全部是修复模式
          await pageOne.select('select[ng-model="ORDER_DATA.contractbase.receivabletype"]', '修改模式'); // 单选择器
        }
        await pageOne.click('[ng-model="ORDER_DATA.contractbase.effectdate"]')
        // await pageOne.waitForSelector(`[lang="zh-cn"]`)
        // await pageOne.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '[lang="zh-cn"]');
        // 上面两行仅在headless为false时生效，为true时不生效，很奇怪，先改成等待1秒
        pageOne.waitFor(1000)
        const elementHandle = await pageOne.$('iframe');
        const frame = await elementHandle.contentFrame();
        await frame.waitForSelector('#dpTodayInput');
        await frame.click('#dpTodayInput')
      }
    }
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
        try {
          const href = await pageContract.$eval('.ui-grid-canvas > .ui-grid-row:nth-child(' + (ind + 1) + ') .ui-grid-coluiGrid-0005 > .ui-grid-cell-contents > a', (el) => {
            return el.href
          })
          await submitOne(href, tempNo)
        } catch(e) {
          log.error(e.stack);
          log.error(`----${tempNo}合同处理失败----合同未找到或未知异常----`)
          errorArr.push(tempNo)
        }
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
      try {
        await pageContract.waitForSelector(`[role="dialog"] .ui-grid-canvas .ui-grid-coluiGrid-0005 .ui-grid-cell-contents a`)
        const href = await pageContract.$eval('[role="dialog"] .ui-grid-canvas .ui-grid-coluiGrid-0005 .ui-grid-cell-contents a', (el) => {
          return el.href
        })
        await submitOne(href, invoiceNo)
      } catch(e) {
        log.error(e.stack);
        log.error(`----${invoiceNo}合同处理失败----合同未找到或未知异常----`)
        errorArr.push(invoiceNo)
      }
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

async function uploadContract(opts) {
  const {browser, page, invoiceArr, contractPath} = opts
  const start = Date.now();
  log.info(`----上传销售合同自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/hold/docManageUpload')
  await page.waitForSelector('button[value="批量上传文件"]')
  await page.waitForSelector('input[value="批量上传文件"]')
  // await page.click('button[value="批量上传文件"]')
  const uploadPdf = await page.waitForSelector('input[value="批量上传文件"]')

  // 上传桌面的pdf文件
  async function selectPdf(invoiceArr) {
    for(let ind = 0; ind < invoiceArr.length; ind++) {
      const invoiceNo = invoiceArr[ind]
      const filename = `${contractPath}/销售_${invoiceNo}_${invoiceNo.includes('-') ? '补充协议' : '合同'}.pdf`
      const filename2 = `${contractPath}/销售_${invoiceNo}_解除协议.pdf`
      if (fs.existsSync(filename)) {
        await uploadPdf.uploadFile(filename)
        successArr.push(invoiceNo)
      } else if (fs.existsSync(filename2)) {
        await uploadPdf.uploadFile(filename2)
        successArr.push(invoiceNo)
      } else {
        log.error(`----${invoiceNo}合同处理失败----${filename}文件未找到----`)
        errorArr.push(invoiceNo)
      }
    }
  }
  // 选中已上传文件，确认提交
  async function doUploadPdf() {
    // 需要等待页面上的文件都上传成功了
    await page.waitForFunction((selector, len) => document.querySelectorAll(selector).length === len, {}, '.addTable > .tab_data > .tab_body > tr', successArr.length);
    const cksLen = await page.$$eval('.addTable > .tab_data > .tab_body > tr input[type="checkbox"]', els => els.length);
    if (cksLen < successArr.length || cksLen === 0) {
      log.error(`----有文件上传异常，请重新操作----`)
      successArr = []
      return
    }
    await page.$$eval('.addTable > .tab_data > .tab_body > tr input[type="checkbox"]', cks => {
      for(let i = 0; i < cks.length; i++) {
        cks[i].click()
      }
    });
    await page.waitForSelector('button[type="submit"]')
    await page.click('button[type="submit"]')
    await page.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert');
    await page.waitForFunction(selector => document.querySelector(selector).innerHTML !== 'Title', {}, '.sweet-alert > h2');
    await page.waitFor(1000)
    await page.click('.sweet-alert > .sa-button-container > .sa-confirm-button-container > .confirm')
    await page.waitForFunction(selector => document.querySelector(selector).style.display !== 'block', {}, '.sweet-alert > .sa-warning');
    await page.waitForFunction(selector => document.querySelector(selector).style.display === 'block', {}, '.sweet-alert > .sa-success');
    const successDisplay = await page.$eval('.sweet-alert > .sa-success', el => el.style.display);
    const dialogTxt = await page.$eval('.sweet-alert > h2', el => el.innerHTML);
    if (successDisplay === 'block') {
      log.info(`----确认上传成功----${dialogTxt}----`)
    } else {
      log.error(`----确认上传失败----${dialogTxt}----`)
      successArr = []
    }
  }
  let successArr = []
  const errorArr = []
  let notFoundArr = []
  const processIdArr = []
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  await selectPdf(invoiceArr)
  try {
    await doUploadPdf()
  } catch (e) {
    log.error(e.stack);
    log.error(`----未知异常----`)
    successArr = []
  }
  log.info(`----上传销售合同自动化任务结束----总耗时${Date.now() - start}----`)
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
  submitContract,
  uploadContract
}