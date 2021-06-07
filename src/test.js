const fs = require('fs')
const puppeteerUtil = require('./utils/puppeteerUtil')
const xlsx = require('xlsx');
const moment = require('moment')
var cp = require('child_process');

async function init() {
  // await puppeteerUtil.login({name: 'zhaorun', password: 'zhaorun612', headless: false, chromePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'})
  // await puppeteerUtil.makeInvoice({invoiceArr: ['SOSA2021001239']})
  // await puppeteerUtil.submitInvoice({invoiceArr: ['SOA2021000084'], realAmount0: false})
  // await puppeteerUtil.createYS({invoiceArr: ['SOA2021012832'], financeYSExcelPath: 'C:/Users/20720/Desktop/创建应收.xlsx'})
  // await puppeteerUtil.uploadContract({invoiceArr: ['SOA2020032428-V001'], contractPath: 'C:\\Users\\20720\\Desktop'})
  // console.log(fs.existsSync('C:\\Users\\20720\\Desktop\\销售_SOA2021004481_合同.pdf'))
  // console.log(fs.existsSync('C:\\Users\\20720\\Desktop\\销售_SOA2021004481_合同111.pdf'))


  // let workbook = xlsx.readFile('C:/Users/20720/Desktop/创建应收.xlsx'); //workbook就是xls文档对象
  // let sheetNames = workbook.SheetNames; // 获取表明
  // let sheet = workbook.Sheets[sheetNames[0]]; // 通过表明得到表对象
  // let data = xlsx.utils.sheet_to_json(sheet); //通过工具将表对象的数据读出来并转成json
  // console.log(data)

//   let json = [ 
//       {"大标题":null},
//       {null:"大标题"},
//       {null:"大标题"},
//       {null:"大标题"},
//       { Name: 'name_01', Age: 21, Address: 'address_01' },
//       { Name: 'name_02', Age: 22, Address: 'address_02' },
//       { Name: 'name_03', Age: 23, Address: 'address_03' },
//       { Name: 'name_04', Age: 24, Address: 'address_04' },
//       { Name: 'name_05', Age: 25, Address: 'address_05' }, ];

//   let ss = xlsx.utils.json_to_sheet(json); //通过工具将json转表对象
//   let keys = Object.keys(ss).sort(); //排序 [需要注意，必须从A1开始]

//   let ref = keys[1]+':'+keys[keys.length - 1]; //这个是定义一个字符串 也就是表的范围[A1:C5] 

//   let workbook = { //定义操作文档
//       SheetNames:['Sheet1'], //定义表明
//       Sheets:{
//           'Sheet1': Object.assign({},ss,{'!ref':ref}) //表对象[注意表明]
//       },
//   }

//   xlsx.writeFile(workbook, 'C:/Users/20720/Desktop/创建应收.xlsx'); //将数据写入文件

    // console.log(moment().format('YYYY.M.D'))


    
 
  // var ls = cp.exec('cscript C:/Users/20720/AppData/Roaming/SAP/"SAP GUI"/Scripts/创建应收.vbs', {});
  // var ls = cp.exec('cscript C:/Users/20720/AppData/Roaming/SAP/"SAP GUI"/Scripts/创建应收.vbs', {});
  // ls.stdout.on('data', function (data) {
  //   console.log('stdout: ' + data);
  // });
  // ls.stderr.on('data', function (data) {
  //   console.log('stderr: ' + data);
  // });
  // ls.on('exit', function (code) {
  //   console.log('child process exited with code ' + code);
  // });
  // cp.execFileSync('C:/Users/20720/AppData/Roaming/SAP/SAP GUI/Scripts/创建应收.vbs')
  await puppeteerUtil.executeYS({financeYSScriptPath: 'C:/Users/20720/AppData/Roaming/SAP/SAP GUI/Scripts/创建应收.vbs'})
}

init().then((res) => {

})
