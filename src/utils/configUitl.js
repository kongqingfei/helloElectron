const os = require('os')
const fs = require('fs')
const homedir = os.homedir()
const dirPath = homedir + '\\.rainfly'
const fileName = dirPath + '\\config.json'

const ext = {
  readConfig: () => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath)
    }
    if (!fs.existsSync(fileName)) {
      fs.writeFileSync(fileName, '{"login": {"name": "zhaorun", "password": "zhaorun612"}}')
    }
    return JSON.parse(fs.readFileSync(fileName))
  },
  writeConfig: (cfg) => {
    fs.writeFileSync(fileName, JSON.stringify(cfg))
  }
}

module.exports = ext