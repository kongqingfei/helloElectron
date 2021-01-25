const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const { Notification } = require('electron')
const {readConfig, writeConfig} = require('./utils/configUitl.js')
const puppeteerUtil = require('./utils/puppeteerUtil')
const log = require('./utils/logUtil')
const config = readConfig()

ipcMain.on('getConfig', (event) => {
  event.returnValue = config
})
ipcMain.on('getConfigValue', (event, key) => {
  event.returnValue = config[key]
})
ipcMain.on('setConfigValue', (event, param) => {
  const oldStr = JSON.stringify(config)
  Object.assign(config, param)
  if (JSON.stringify(config) !== oldStr) {
    writeConfig(config)
  }
})
ipcMain.handle('puppeteer.login', async (event, param) => {
  return await puppeteerUtil.login(param)
})
ipcMain.handle('puppeteer.makeInvoice', async (event, param) => {
  return await puppeteerUtil.makeInvoice(param)
})
ipcMain.handle('puppeteer.downloadInvoice', async (event, param) => {
  return await puppeteerUtil.downloadInvoice(param)
})
ipcMain.handle('puppeteer.submitContract', async (event, param) => {
  return await puppeteerUtil.submitContract(param)
})
ipcMain.handle('puppeteer.submitInvoice', async (event, param) => {
  return await puppeteerUtil.submitInvoice(param)
})
ipcMain.handle('log.getLog', async () => {
  return log.getLog()
})

function showNotification () {
  const notification = {
    title: 'Basic Notification',
    body: 'Notification from the Main process'
  }
  new Notification(notification).show()
}


function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 960,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })
  win.loadFile('./src/pages/index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})