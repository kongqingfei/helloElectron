const puppeteer = require('puppeteer')
const {screenWidth, screenHeight} = require('../config')

module.exports = {
  createPage: async function(opts) {
    const browser = await puppeteer.launch(Object.assign({
      // "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      executablePath: opts.chromePath,
      // headless: false,
      args: ['--start-maximized'],
      // slowMo: 30,
    }, opts));
    return {browser, page: (await browser.pages())[0]};
  },
  login: async function(page, name="zhaorun", password="zhaorun222") {
    await page.setViewport({width: screenWidth, height: screenHeight});
    await page.goto('http://cdwp.cnbmxinyun.com/#/as/login');
    await page.waitForSelector('input[ng-model=user_name]')
    await page.waitForSelector('input[ng-model=password]')
    await page.waitForSelector('button.btnTextLog')
    await page.type('input[ng-model=user_name]', name);
    await page.type('input[ng-model=password]', password);
    await page.click('button.btnTextLog')
    await page.waitForSelector('#table > tbody > tr')
    console.info(`----登录成功----`)
    return true
  }
}
