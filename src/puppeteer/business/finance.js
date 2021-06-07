const {screenWidth, screenHeight} = require('../config')
const {waitForInnerHTML} = require('../utils/util');
const log = require('../../utils/logUtil')
const moment = require('moment')
const xlsx = require('xlsx');
const cp = require('child_process');
const iconv = require('iconv-lite');

async function createYS(opts) {
  const {browser, page, invoiceArr, financeYSExcelPath, financeYSScriptPath} = opts
  const start = Date.now();
  log.info(`----财务—创建应收自动化任务开始----`)
  await page.goto('http://cdwp.cnbmxinyun.com/#/hold/contractOrder');
  // 处理单个合同
  async function submitOne(invoiceNo) {
    log.info(`----${invoiceNo}合同处理开始----`)
    let pageInvoice, order, amount;
    // 查合同跳转合同
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
    order = await page.$eval(`.ui-grid-row:nth-child(${rowIndex + 1}) .ui-grid-coluiGrid-0005.ui-grid-cell .ui-grid-cell-contents`, el => el.innerHTML);
    amount = Number(await page.$eval(`.ui-grid-row:nth-child(${rowIndex + 1}) .ui-grid-coluiGrid-000A.ui-grid-cell .ui-grid-cell-contents`, el => el.innerHTML.replaceAll(',', '').replace('￥&nbsp;', '')));
    await page.waitForSelector(`.ui-grid-row:nth-child(${rowIndex + 1}) .ui-grid-coluiGrid-0004.ui-grid-cell .ui-grid-cell-contents > a`)
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));    // 声明变量
    await page.click(`.ui-grid-row:nth-child(${rowIndex + 1}) .ui-grid-coluiGrid-0004.ui-grid-cell .ui-grid-cell-contents > a`)
    pageInvoice = await newPagePromise;           // newPage就是a链接打开窗口的Page对象
    await pageInvoice.bringToFront()
    try {
      await pageInvoice.setViewport({width: screenWidth, height: screenHeight});
      // 等待页面打开
      await waitForInnerHTML(pageInvoice, '.genTitle2 strong:nth-child(2)', '所属公司：中建材信息技术股份有限公司')
      // 跳转文本信息
      await pageInvoice.click('[ng-class="{active:ht.activeTab == 6}"]')
      // 读取付款信息，写入excel的buffer
      const divsCount = await pageInvoice.$$eval('.viewTable > .addTable:nth-child(7) .tab_body tr', els => els.length)
      let type = ''
      for(let i = 0; i < divsCount; i++) {
        type = await pageInvoice.$eval(`.viewTable > .addTable:nth-child(7) .tab_body tr:nth-child(${i+1}) td:nth-child(1)`, el => el.innerHTML)
        const percent = await pageInvoice.$eval(`.viewTable > .addTable:nth-child(7) .tab_body tr:nth-child(${i+1}) td:nth-child(2)`, el => el.innerHTML)
        const days = await pageInvoice.$eval(`.viewTable > .addTable:nth-child(7) .tab_body tr:nth-child(${i+1}) td:nth-child(3)`, el => el.innerHTML)
        const json = {
          '销售凭证': order,
          '账龄（天）': type === '预付款' ? '' : days,
          '应收金额': Math.round(amount*Number(percent))/100,
          '账龄起始日期': type === '预付款' ? moment().format('YYYY.M.D') : '',
          '销售合同': invoiceNo,
          '付款类型': type,
          '返点后合同金额': amount
        }
        buffer.push(json)
        log.info(`----${invoiceNo}合同${order}销售凭证已添加到buffer----`)
        if (!successArr.includes(invoiceNo)) {
          successArr.push(invoiceNo)
        }
      }
      // 判断是否为自动化
      if (isAuto) {
        isAuto = divsCount === 1 && type === '预付款'
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
  const buffer = []
  let isAuto = true, writeRet = false, scriptRet = false
  log.info(`全部待处理合同：${JSON.stringify(invoiceArr)}`)
  for(let i = 0; i < invoiceArr.length; i++) {
    try {
      await submitOne(invoiceArr[i])
    } catch(e) {
      log.error(e.stack);
      log.error(`----${invoiceArr[i]}合同添加到buffer失败----未知异常----`)
      waitArr.push(invoiceArr[i])
    }
  }
  // 失败重试一次
  log.info(`异常合同重试添加到buffer：${JSON.stringify(waitArr)}`)
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
        log.error(`----${prevArr[i]}合同添加到buffer失败----未知异常----`)
        tempArr.push(prevArr[i])
      }
    }
  } while(tempArr.length < prevLen)
  tempArr.forEach((item) => {
    errorArr.push(item)
  })
  // buffer有内容则直接写excel
  if (buffer.length) {
    let ss = xlsx.utils.json_to_sheet(buffer); //通过工具将json转表对象
    let keys = Object.keys(ss).sort(); //排序 [需要注意，必须从A1开始]
    let ref = keys[1]+':'+keys[keys.length - 1]; //这个是定义一个字符串 也就是表的范围[A1:C5] 
    let workbook = { //定义操作文档
        SheetNames:['Sheet1'], //定义表明
        Sheets:{
            'Sheet1': Object.assign({},ss,{'!ref':ref}) //表对象[注意表明]
        },
    }
    xlsx.writeFile(workbook, financeYSExcelPath); //将数据写入文件
    writeRet = true
    log.info(`写入excel成功，写入内容${JSON.stringify(buffer)}，写入文件${financeYSExcelPath}`)
  }
  if (isAuto) {
    const {ret: tmpRet, msg: tmpMsg} = await executeYS({financeYSScriptPath})
    scriptRet = tmpRet
  }
  log.info(`----财务—创建应收自动化任务结束----总耗时${Date.now() - start}----`)
  log.info(`全部合同：${JSON.stringify(invoiceArr)}，共${invoiceArr.length}个`)
  log.info(`添加到buffer成功合同：${JSON.stringify(successArr)}，共${successArr.length}个`)
  log.info(`添加到buffer失败合同：${JSON.stringify(errorArr)}，共${errorArr.length}个`)
  log.info(`writeRet=${writeRet},isAuto=${isAuto},scriptRet=${scriptRet}`)
  return {invoiceArr, successArr, errorArr, isAuto, writeRet, scriptRet}
}

async function executeYS(opts) {
  const {financeYSScriptPath} = opts
  return new Promise((res) => {
    let encoding = 'cp936';
    let binaryEncoding = 'buffer';
    cp.exec('cscript ' + financeYSScriptPath.split("/").reduce((prev, cur) => {
      if (cur.includes(' ')) {
        prev.push(`"${cur}"`)
      } else {
        prev.push(cur)
      }
      return prev
    }, []).join("/"), {encoding: binaryEncoding}, (err, stdout, stderr) => {
      if (err) {
        log.error('创建应收脚本执行失败1')
        log.error(iconv.decode(stdout, encoding))
        res({ret: false, msg: iconv.decode(stdout, encoding)})
      } else if (stderr && stderr.trim && stderr.trim()) {
        log.error('创建应收脚本执行失败2')
        log.error(iconv.decode(stderr, encoding))
        res({ret: false, msg: iconv.decode(stderr, encoding)})
      } else {
        log.info('创建应收脚本执行成功')
        log.info(iconv.decode(stdout, encoding))
        res({ret: true, msg: iconv.decode(stdout, encoding)})
      }
    })
  })
}

module.exports = {
  createYS,
  executeYS
}