const {remote, ipcRenderer} = require('electron')
const config = ipcRenderer.sendSync('getConfig')
function qs(selector) {
  return document.querySelector(selector)
}
function alert(msg) {
  qs('.jsLogin').innerHTML = msg
}
function bindEvent() {
  qs('.jsPathSelect').addEventListener('click', () => {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ['openDirectory'] }).then((res) => {
      const {canceled, filePaths} = res;
      if (!canceled) {
        qs('.jsPath').innerHTML = filePaths[0]
        config.download = config.download || {}
        config.download.draftPath = filePaths[0]
        ipcRenderer.send('setConfigValue', {download: config.download})
      }
    })
  })
}
bindEvent()
function init() {
  const {login, download={}} = config
  qs('#name').value = login.name
  qs('#password').value = login.password
  if (download.draftPath) {
    qs('.jsPath').innerHTML = download.draftPath
  }
  // alert(ipcRenderer.sendSync('os.homedir', {a: 1, b: 2}))
}
init()