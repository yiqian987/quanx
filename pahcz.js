/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?://newretail\.pingan\.com\.cn/ydt/reserve/store/bookingTime\?.* url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz.js

[mitm]
hostname = newretail.pingan.com.cn

*************************************/

// 创建一个表示当前日期和时间的新Date对象
const currentDate = new Date();

// 获取星期几的数字
const dayOfWeekNumber = currentDate.getDay();

// 如果是周一到周三，则将日期增加2天
if (dayOfWeekNumber >= 1 && dayOfWeekNumber <= 3) {
  currentDate.setDate(currentDate.getDate() + 2);
}
// 如果是周四或周五，则将日期增加4天
else if (dayOfWeekNumber === 4 || dayOfWeekNumber === 5) {
  currentDate.setDate(currentDate.getDate() + 4);
}

// 获取单独的日期组成部分
const year = currentDate.getFullYear();
const month = currentDate.getMonth() + 1 < 10 ? '0' + (currentDate.getMonth() + 1) : currentDate.getMonth() + 1;
const day = currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate();

// 创建一个包含星期几名称的数组
const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 获取星期几的名称
const dayOfWeek = daysOfWeek[dayOfWeekNumber];

// 组合成“年-月-日 星期几”格式
const formattedDate = `${year}年${month}月${day}日 ${dayOfWeek}`;
console.log(formattedDate);

var body = $response.body;
body = body.replace(/\"bookingDate":"\d{4}年\d{1,2}月\d{1,2}日\s星期[一二三四五六日]"/, '\"bookingDate": "'+formattedDate+'"');

body = body.replace(/\"bookableNum":\d+/g, '\"bookableNum":100');

body = body.replace(/\"totalBookableNum":\d+/g, '\"totalBookableNum":100');

body = body.replace(/\"totalBooked":\d+/g, '\"totalBooked":0');

$done({body})
