const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const { Notification } = require('electron')
const {readConfig, writeConfig} = require('./utils/configUitl.js')
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

  win.setProgressBar(0.5)

  // dialog.showOpenDialog(win, { properties: ['openDirectory'] }).then((res) => {
  //   console.log(res)
  // })

  //设置菜单
  // let dockMenu = Menu.buildFromTemplate([
  //   {
  //       label: '文件', click: function () {
  //           console.log('点击事件');
  //       }
  //   },
  //   {
  //       label: '编辑', submenu: [
  //           {label: '保存'},
  //           {label: '另存'}
  //       ]
  //   },
  //   {label: '帮助'}
  // ]);
  // Menu.setApplicationMenu(dockMenu);
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