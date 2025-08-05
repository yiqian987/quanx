/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/newretail\.pingan\.com\.cn/ydt/reserve/store/bookingTime\?.* url script-echo-response https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz.js

[mitm]
hostname = newretail.pingan.com.cn

*************************************/

const myStatus = "HTTP/1.1 200 OK";

const myHeaders = {"Server": "loading", "Content-Type": "application/json", "Connection": "keep-alive"};

// 创建一个表示当前日期和时间的新Date对象
const currentDate = new Date();

// 获取星期几的数字
const dayOfWeekNumber = currentDate.getDay();

// 如果是周一到周四，则将日期增加1天
if (dayOfWeekNumber >= 1 && dayOfWeekNumber <= 4) {
  currentDate.setDate(currentDate.getDate() + 1);
}
// 如果是周五，则将日期增加3天
// else if (dayOfWeekNumber === 4 || dayOfWeekNumber === 5) {
else if (dayOfWeekNumber === 5) {
  currentDate.setDate(currentDate.getDate() + 3);
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

const myData = JSON.stringify({
	"code": 200,
	"msg": "OK",
	"data": [{
		"storefrontSeq": "10098",
		"bookingDate": "2025年08月06日 星期三",
		"businessType": "29",
		"totalBookableNum": 3,
		"totalBookable": 3,
		"totalBooked": 0,
		"bookingRules": [{
			"idBookingSurvey": "0f4917554af746dca2603f618926a2d9",
			"startTime": "9:00",
			"endTime": "11:00",
			"bookableNum": 2,
			"bookedNum": 0
		}, {
			"idBookingSurvey": "ef56e0c90e554d62a83de8aa647b6a33",
			"startTime": "14:00",
			"endTime": "16:00",
			"bookableNum": 1,
			"bookedNum": 0
		}]
	}]
});

const myResponse = {
    status: myStatus,
    headers: myHeaders,
    body: myData
};

$done(myResponse);
