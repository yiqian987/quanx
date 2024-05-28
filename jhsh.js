/*************************************

项目名称: 建行生活

**************************************

[rewrite_local]
^https?://yunbusiness\.ccb\.com/(clp_coupontx/Ctrl\?.*|clp_service/txCtrl?txcode=A3341C.*) url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/jhsh.js
[mitm]
hostname = yunbusiness.ccb.com

*************************************/

// 创建一个表示当前日期和时间的新Date对象
const currentDate = new Date();
// 直接输出Date对象会返回详细的日期和时间字符串
// 输出类似于 "Fri Apr 07 2024 1.png:49:27 GMT+0800 (China Standard Time)"
// 获取单独的日期组成部分
const year = currentDate.getFullYear();
// 当前年份（四位数）
const month = currentDate.getMonth() + 1 < 10 ? '0' + (currentDate.getMonth() + 1) : currentDate.getMonth() + 1;
// 当前月份（范围：1-12，因为getMonth返回的是0-11）
const day = currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate();
// 当前日（1-31）
// 组合成“年-月-日”格式
const formattedDate = `${year}-${month}-${day}`;


var body = $response.body;

body = body.replace(/\"SYSTEM_TIME":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/, '\"SYSTEM_TIME": "'+formattedDate+' 18:59:59"');
//body = body.replace(/\"SYSTEM_TIME":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/, '\"SYSTEM_TIME": "2024-04-07 18:59:59"');

// HdFrSl_Lock_Num:可修改状态为“已抢光，若有人放弃可补抢”
body = body.replace(/\"HdFrSl_Lock_Num":"\d+",/g, '\"HdFrSl_Lock_Num": "0",');

// "RvPy_Txn_Tot_Dnum":可修改状态为 今日已抢光
body = body.replace(/\"RvPy_Txn_Tot_Dnum":"\d+"/g, '\"RvPy_Txn_Tot_Dnum": "0"');

body = body.replace(/\"SOLD_OUT_DATE":"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",/g, '\"SOLD_OUT_DATE": "0",');

// Alrdy_Sell_Ivnt_Num:可修改状态为“已抢光”
body = body.replace(/\"Alrdy_Sell_Ivnt_Num":"\d+",/g, '\"Alrdy_Sell_Ivnt_Num": "1",');

body = body.replace(/\"AVALIABLE_STOCK":"\d+",/g, '\"AVALIABLE_STOCK":"50",');

body = body.replace(/\"SURPLUS_STOCK":"\d+",/g, '\"SURPLUS_STOCK": "30",');

body = body.replace(/\"EFFECT_PERIOD_END":"\d+",/g, '\"EFFECT_PERIOD_END": "20990630235959",');

body = body.replace(/\"Cur_Vld_Ind":"\d+",/g, '\"Cur_Vld_Ind": "1",');

// "Remain_Num":可修改状态为“已抢光”
body = body.replace(/\"Remain_Num":"\d+",/g, '\"Remain_Num": "1",');

body = body.replace(/\"SpBkAtAyTm_Ind":"\d+",/g, '\"SpBkAtAyTm_Ind": "0",');

body = body.replace(/\"USER_GET_NUM":"\d+",/g, '\"USER_GET_NUM": "0",');

$done({body});
