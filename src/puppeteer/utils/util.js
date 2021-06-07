const request = require('request');
const fs = require('fs');

const ext = {
  affair: async function(page, fun) {
    try {
      await fun();
    } catch(e) {
      console.error(e)
      console.info(`事务重新执行，当前页面：${page.url()}`)
      await page.reload();
      ext.affair(page, fun)
    }
  },
  getErrorMsg:  async function(page) {
    let ret = await page.$eval('.sweet-alert > h2', el => el.innerHTML)
    if (!ret) {
      ret = await page.$eval('.sweet-alert > p', el => el.innerHTML)
    }
    return ret
  },
  /*
* url 网络文件地址
* filename 文件名
* callback 回调函数
*/
  downloadFile: async function (uri, filename) {
    return new Promise((res) => {
      var stream = fs.createWriteStream(filename);
      request(uri).pipe(stream).on('close', res); 
    })
  },
  waitForInnerHTML: async function (page, selector, innerHTML) {
    try {
      if (await page.$eval(selector, el => el.innerHTML) !== innerHTML) {
        await page.waitFor(500)
        await ext.waitForInnerHTML(page, selector, innerHTML)
      }
    } catch(e) {
      await page.waitFor(500)
      await ext.waitForInnerHTML(page, selector, innerHTML)
    }
  }
}

module.exports = ext;