const {remote, ipcRenderer} = require('electron')
const config = ipcRenderer.sendSync('getConfig')
let logTask = null, currentTa = null
let isLogin = false
function qs(selector) {
  return document.querySelector(selector)
}
function alert(msg) {
  qs('.jsLogin').innerHTML = msg
}
async function toast(msg) {
  await remote.dialog.showMessageBox(remote.getCurrentWindow(), {title: '操作提示', message: msg})
}
function bindEvent() {
  // 选择谷歌浏览器路径
  qs('.login .jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'chrome.exe', extensions: ['exe'] }
      ]
    }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.login .jsPath').innerHTML = filePaths[0]
        config.chromePath = filePaths[0]
        ipcRenderer.send('setConfigValue', {chromePath: config.chromePath})
      }
    })
  })
  // 选择应收Excel路径
  qs('.financeYS .excel .jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      properties: ['openFile'],
      filters: [
        { name: '创建应收.xlsx', extensions: ['xlsx'] }
      ]
    }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.financeYS .jsPath').innerHTML = filePaths[0]
        config.financeYSExcelPath = filePaths[0]
        ipcRenderer.send('setConfigValue', {financeYSExcelPath: config.financeYSExcelPath})
      }
    })
  })
  // 选择应收脚本路径
  qs('.financeYS .script .jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      properties: ['openFile'],
      filters: [
        { name: '创建应收.vbs', extensions: ['vbs'] }
      ]
    }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.financeYS .script .jsPath').innerHTML = filePaths[0]
        config.financeYSScriptPath = filePaths[0]
        ipcRenderer.send('setConfigValue', {financeYSScriptPath: config.financeYSScriptPath})
      }
    })
  })
  // 选择下载草稿路径
  qs('.download .jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.download .jsPath').innerHTML = filePaths[0]
        config.download = config.download || {}
        config.download.draftPath = filePaths[0]
        ipcRenderer.send('setConfigValue', {download: config.download})
      }
    })
  })
  // 选择合同上传文件路径
  qs('.contractUpload .jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.contractUpload .jsPath').innerHTML = filePaths[0]
        config.contract = config.contract || {}
        config.contract.contractPath = filePaths[0]
        ipcRenderer.send('setConfigValue', {contract: config.contract})
      }
    })
  })
  qs('.jsToWho').addEventListener('change', () => {
    config.contract = config.contract || {}
    config.contract.toWho = qs('.jsToWho').value
    ipcRenderer.send('setConfigValue', {contract: config.contract})
  })
  // 登录
  qs('.jsLogin').addEventListener('click', async () => {
    if (!config.chromePath) {
      return await toast('请先设置谷歌浏览器路径')
    }
    qs('.login .status').innerHTML = '（登录中...）'
    qs('.login .status').className = 'status'
    const ret = await ipcRenderer.invoke('puppeteer.login', {...config.login, chromePath: config.chromePath})
    if (ret) {
      qs('.login .status').innerHTML = '（登录成功）'
      qs('.login .status').className = 'status success'
    } else {
      qs('.login .status').innerHTML = '（登录失败）'
      qs('.login .status').className = 'status error'
    }
    
    isLogin = true
  })
  // 做发票草稿
  qs('.jsDoInvoice').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    const invoiceArr = (qs('.invoice .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.invoice .jsInvoiceSuccess').value = ''
    qs('.invoice .jsNumSuccess').innerHTML = `共0个`
    qs('.invoice .jsInvoiceError').value = ''
    qs('.invoice .jsNumError').innerHTML = `共0个`
    qs('.invoice .jsInvoiceOrder').value = ''
    qs('.invoice .jsNumOrder').innerHTML = `共0个`
    qs('.invoice .jsStatus').innerHTML = '（运行中...）'
    qs('.invoice .remark').innerHTML = `&nbsp;`
    qs('.invoice .remark').className = 'remark'
    currentTa = qs('#logInvoice')
    getLog(true)
    const {successArr, errorArr, orderArr} = await ipcRenderer.invoke('puppeteer.makeInvoice', {invoiceArr});
    qs('.invoice .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.invoice .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.invoice .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.invoice .jsInvoiceError').value = errorArr.join('\n')
    qs('.invoice .jsNumError').innerHTML = `共${errorArr.length}个`
    qs('.invoice .jsInvoiceOrder').value = orderArr.join('\n')
    qs('.invoice .jsNumOrder').innerHTML = `共${orderArr.length}个`
    stopLog()
    qs('.invoice .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0) {
      qs('.invoice .remark').innerHTML = `全部提交成功`
      qs('.invoice .remark').className = 'remark success'
    } else {
      qs('.invoice .remark').innerHTML = `部分合同号提交失败`
      qs('.invoice .remark').className = 'remark error'
    }
  })
  // 下载草稿
  qs('.jsDoDownload').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    if (!config.download || !config.download.draftPath) {
      return await toast('请先设置下载路径')
    }
    const invoiceArr = (qs('.download .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.download .jsInvoiceSuccess').value = ''
    qs('.download .jsNumSuccess').innerHTML = `共0个`
    qs('.download .jsInvoiceError').value = ''
    qs('.download .jsNumError').innerHTML = `共0个`
    qs('.download .jsStatus').innerHTML = '（运行中...）'
    qs('.download .remark').innerHTML = `&nbsp;`
    qs('.download .remark').className = 'remark'
    currentTa = qs('#logDownload')
    getLog(true)
    const {successArr, errorArr, notFoundArr, filename} = await ipcRenderer.invoke('puppeteer.downloadInvoice', {invoiceArr, draftPath: config.download.draftPath});
    qs('.download .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.download .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.download .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.download .jsInvoiceError').value = notFoundArr.join('\n')
    qs('.download .jsNumError').innerHTML = `共${notFoundArr.length}个`
    stopLog()
    qs('.download .jsStatus').innerHTML = '（当前未运行）'
    if (successArr.length > 0) {
      qs('.download .remark').innerHTML = `${filename}`
      qs('.download .remark').className = 'remark success'
    } else {
      qs('.download .remark').innerHTML = `未找到可下载草稿`
      qs('.download .remark').className = 'remark error'
    }
  })
  // 合同上传
  qs('.jsDoContractUpload').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    if (!config.contract || !config.contract.contractPath) {
      return await toast('请先设置合同文件路径')
    }
    const invoiceArr = (qs('.contractUpload .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.contractUpload .jsInvoiceSuccess').value = ''
    qs('.contractUpload .jsNumSuccess').innerHTML = `共0个`
    qs('.contractUpload .jsInvoiceError').value = ''
    qs('.contractUpload .jsNumError').innerHTML = `共0个`
    qs('.contractUpload .jsStatus').innerHTML = '（运行中...）'
    qs('.contractUpload .remark').innerHTML = `&nbsp;`
    qs('.contractUpload .remark').className = 'remark'
    currentTa = qs('#logContractUpload')
    getLog(true)
    const {successArr, errorArr} = await ipcRenderer.invoke('puppeteer.uploadContract', {invoiceArr, contractPath: config.contract.contractPath});
    qs('.contractUpload .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.contractUpload .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.contractUpload .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.contractUpload .jsInvoiceError').value = errorArr.join('\n')
    qs('.contractUpload .jsNumError').innerHTML = `共${errorArr.length}个`
    stopLog()
    qs('.contractUpload .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0 && successArr.length > 0) {
      qs('.contractUpload .remark').innerHTML = `全部提交成功`
      qs('.contractUpload .remark').className = 'remark success'
    } else {
      qs('.contractUpload .remark').innerHTML = `部分合同号提交失败`
      qs('.contractUpload .remark').className = 'remark error'
    }
  })
  // 合同提交
  qs('.jsDoContractSubmit').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    const invoiceArr = (qs('.contractSubmit .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.contractSubmit .jsInvoiceSuccess').value = ''
    qs('.contractSubmit .jsNumSuccess').innerHTML = `共0个`
    qs('.contractSubmit .jsInvoiceError').value = ''
    qs('.contractSubmit .jsNumError').innerHTML = `共0个`
    qs('.contractSubmit .jsStatus').innerHTML = '（运行中...）'
    qs('.contractSubmit .remark').innerHTML = `&nbsp;`
    qs('.contractSubmit .remark').className = 'remark'
    currentTa = qs('#logContractSubmit')
    getLog(true)
    const {successArr, errorArr} = await ipcRenderer.invoke('puppeteer.submitContract', {invoiceArr, toWho: config.contract.toWho});
    qs('.contractSubmit .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.contractSubmit .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.contractSubmit .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.contractSubmit .jsInvoiceError').value = errorArr.join('\n')
    qs('.contractSubmit .jsNumError').innerHTML = `共${errorArr.length}个`
    stopLog()
    qs('.contractSubmit .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0) {
      qs('.contractSubmit .remark').innerHTML = `全部提交成功`
      qs('.contractSubmit .remark').className = 'remark success'
    } else {
      qs('.contractSubmit .remark').innerHTML = `部分合同号提交失败`
      qs('.contractSubmit .remark').className = 'remark error'
    }
  })
  // 合同-否变是
  qs('.jsDoContractNoToYes').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    const invoiceArr = (qs('.contractNoToYes .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.contractNoToYes .jsInvoiceSuccess').value = ''
    qs('.contractNoToYes .jsNumSuccess').innerHTML = `共0个`
    qs('.contractNoToYes .jsInvoiceError').value = ''
    qs('.contractNoToYes .jsNumError').innerHTML = `共0个`
    qs('.contractNoToYes .jsStatus').innerHTML = '（运行中...）'
    qs('.contractNoToYes .remark').innerHTML = `&nbsp;`
    qs('.contractNoToYes .remark').className = 'remark'
    currentTa = qs('#logContractNoToYes')
    getLog(true)
    const {successArr, errorArr} = await ipcRenderer.invoke('puppeteer.noToYesContract', {invoiceArr});
    qs('.contractNoToYes .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.contractNoToYes .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.contractNoToYes .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.contractNoToYes .jsInvoiceError').value = errorArr.join('\n')
    qs('.contractNoToYes .jsNumError').innerHTML = `共${errorArr.length}个`
    stopLog()
    qs('.contractNoToYes .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0) {
      qs('.contractNoToYes .remark').innerHTML = `全部提交成功`
      qs('.contractNoToYes .remark').className = 'remark success'
    } else {
      qs('.contractNoToYes .remark').innerHTML = `部分合同号提交失败`
      qs('.contractNoToYes .remark').className = 'remark error'
    }
  })
  // 发票提交
  qs('.jsDoInvoiceSubmit').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    const invoiceArr = (qs('.invoiceSubmit .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.invoiceSubmit .jsInvoiceSuccess').value = ''
    qs('.invoiceSubmit .jsNumSuccess').innerHTML = `共0个`
    qs('.invoiceSubmit .jsInvoiceError').value = ''
    qs('.invoiceSubmit .jsNumError').innerHTML = `共0个`
    qs('.invoiceSubmit .jsInvoiceNotFound').value = ''
    qs('.invoiceSubmit .jsNumNotFound').innerHTML = `共0个`
    qs('.invoiceSubmit .jsStatus').innerHTML = '（运行中...）'
    qs('.invoiceSubmit .remark').innerHTML = `&nbsp;`
    qs('.invoiceSubmit .remark').className = 'remark'
    currentTa = qs('#logInvoiceSubmit')
    getLog(true)
    const {successArr, errorArr, notFoundArr} = await ipcRenderer.invoke('puppeteer.submitInvoice', {invoiceArr, realAmount0: qs('.jsRealAmount0').checked});
    qs('.invoiceSubmit .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.invoiceSubmit .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.invoiceSubmit .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.invoiceSubmit .jsInvoiceError').value = errorArr.join('\n')
    qs('.invoiceSubmit .jsNumError').innerHTML = `共${errorArr.length}个`
    qs('.invoiceSubmit .jsInvoiceNotFound').value = notFoundArr.join('\n')
    qs('.invoiceSubmit .jsNumNotFound').innerHTML = `共${notFoundArr.length}个`
    stopLog()
    qs('.invoiceSubmit .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0 && notFoundArr.length === 0) {
      qs('.invoiceSubmit .remark').innerHTML = `全部提交成功`
      qs('.invoiceSubmit .remark').className = 'remark success'
    } else {
      qs('.invoiceSubmit .remark').innerHTML = `部分合同号提交失败`
      qs('.invoiceSubmit .remark').className = 'remark error'
    }
  })
  // 创建应收
  qs('.jsDoFinanceYS').addEventListener('click', async () => {
    if (!isLogin) {
      return await toast('请先登录')
    }
    if (!config.financeYSExcelPath) {
      return await toast('请先设置Excel路径')
    }
    if (!config.financeYSScriptPath) {
      return await toast('请先设置脚本路径')
    }
    const invoiceArr = (qs('.financeYS .jsInvoiceAll').value || '').split('\n').reduce((prev, cur) => {
      const temp = cur.trim()
      if (temp) {
        prev.push(temp)
      }
      return prev
    }, [])
    if (invoiceArr.length === 0) {
      return await toast('请先录入待处理合同号')
    }
    qs('.financeYS .jsInvoiceSuccess').value = ''
    qs('.financeYS .jsNumSuccess').innerHTML = `共0个`
    qs('.financeYS .jsInvoiceError').value = ''
    qs('.financeYS .jsNumError').innerHTML = `共0个`
    qs('.financeYS .remark').innerHTML = `&nbsp;`
    qs('.financeYS .remark').className = 'remark'
    currentTa = qs('#logFinanceYS')
    getLog(true)
    const {successArr, errorArr, isAuto, writeRet, scriptRet} = await ipcRenderer.invoke('puppeteer.createYS', {invoiceArr, financeYSExcelPath: config.financeYSExcelPath, financeYSScriptPath: config.financeYSScriptPath});
    qs('.financeYS .jsNumAll').innerHTML = `共${invoiceArr.length}个`
    qs('.financeYS .jsInvoiceSuccess').value = successArr.join('\n')
    qs('.financeYS .jsNumSuccess').innerHTML = `共${successArr.length}个`
    qs('.financeYS .jsInvoiceError').value = errorArr.join('\n')
    qs('.financeYS .jsNumError').innerHTML = `共${errorArr.length}个`
    stopLog()
    qs('.financeYS .jsStatus').innerHTML = '（当前未运行）'
    if (errorArr.length === 0) {
      qs('.financeYS .remark').innerHTML = `合同全部处理 写入excel${writeRet ? '成功' : "失败"} ${isAuto ? `脚本自动执行${scriptRet ? '成功' : "失败，请手动执行"}` : `需要人工介入，请手动执行脚本`}`
      qs('.financeYS .remark').className = 'remark success'
    } else if (errorArr.length > 0 && writeRet) {
      qs('.financeYS .remark').innerHTML = `合同部分处理 写入excel${writeRet ? '成功' : "失败"} ${isAuto ? `脚本自动执行${scriptRet ? '成功' : "失败，请手动执行"}` : `需要人工介入，请手动执行脚本`}`
      qs('.financeYS .remark').className = 'remark success'
    } else {
      qs('.financeYS .remark').innerHTML = `合同处理失败`
      qs('.financeYS .remark').className = 'remark error'
    }
  })
  // 手动执行创建应收脚本
  qs('.jsDoScriptFinanceYS').addEventListener('click', async () => {
    if (!config.financeYSExcelPath) {
      return await toast('请先设置Excel路径')
    }
    if (!config.financeYSScriptPath) {
      return await toast('请先设置脚本路径')
    }
    qs('.financeYS .remark').innerHTML = `&nbsp;`
    qs('.financeYS .remark').className = 'remark'
    currentTa = qs('#logFinanceYS')
    getLog(true)
    const {ret, msg} = await ipcRenderer.invoke('puppeteer.executeYS', {financeYSExcelPath: config.financeYSExcelPath, financeYSScriptPath: config.financeYSScriptPath});
    stopLog()
    qs('.financeYS .jsStatus').innerHTML = '（当前未运行）'
    if (ret) {
      qs('.financeYS .remark').innerHTML = `脚本自动执行成功`
      qs('.financeYS .remark').className = 'remark success'
    } else {
      qs('.financeYS .remark').innerHTML = `脚本自动执行失败`
      qs('.financeYS .remark').className = 'remark error'
    }
  })
}
function getLog(doNext) {
  ipcRenderer.invoke('log.getLog').then((logArr) => {
    if (logArr.length > 0) {
      if (currentTa.value) {
        currentTa.value = currentTa.value + '\n' + logArr.join('\n')
      } else {
        currentTa.value = logArr.join('\n')
      }
      currentTa.scrollTop = currentTa.scrollHeight
    }
    if (doNext) {
      logTask = setTimeout(() => {
        getLog(true)
      }, 1000)
    }
  })
}
function stopLog() {
  clearTimeout(logTask)
  getLog()
}
function init() {
  const {login, download={}, chromePath, contract={}, financeYSExcelPath, financeYSScriptPath} = config
  qs('#name').value = login.name
  qs('#password').value = login.password
  if (download.draftPath) {
    qs('.download .jsPath').innerHTML = download.draftPath
  }
  if (contract.contractPath) {
    qs('.contractUpload .jsPath').innerHTML = contract.contractPath
  }
  if (chromePath) {
    qs('.login .jsPath').innerHTML = chromePath
  }
  if (financeYSExcelPath) {
    qs('.financeYS .excel .jsPath').innerHTML = financeYSExcelPath
  }
  if (financeYSScriptPath) {
    qs('.financeYS .script .jsPath').innerHTML = financeYSScriptPath
  }
  qs('.jsToWho').value = contract.toWho || '3'
  bindEvent()
  // alert(ipcRenderer.sendSync('os.homedir', {a: 1, b: 2}))
}
init()