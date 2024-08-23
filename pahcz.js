/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/newretail\.pingan\.com\.cn/ydt/reserve/store/bookingTime\?.* url script-echo-response https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz.js

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

const myResponse = {
    "code": 200,
    "msg": "OK",
    "data": [
        {
            "storefrontSeq": "39807",
            "bookingDate": formattedDate,
            "businessType": "14",
            "totalBookableNum": 5,
            "totalBookable": 5,
            "totalBooked": 0,
            "bookingRules": [
                {
                    "idBookingSurvey": "5b306357bbe7464b980c119797458b30",
                    "startTime": "9:00",
                    "endTime": "10:00",
                    "bookableNum": 1,
                    "bookedNum": 0
                },
                {
                    "idBookingSurvey": "bdb7b16b7b7841b587f33e3e63aa1af4",
                    "startTime": "10:00",
                    "endTime": "11:00",
                    "bookableNum": 1,
                    "bookedNum": 0
                },
                {
                    "idBookingSurvey": "355fe8c3e77b41e3aeca687e0e82e146",
                    "startTime": "11:00",
                    "endTime": "12:00",
                    "bookableNum": 1,
                    "bookedNum": 0
                },
                {
                    "idBookingSurvey": "dffcf25609934a22910448b4b7206bf9",
                    "startTime": "14:00",
                    "endTime": "15:00",
                    "bookableNum": 1,
                    "bookedNum": 0
                },
                {
                    "idBookingSurvey": "be61761fad344985b2d20dc63ba31efa",
                    "startTime": "15:00",
                    "endTime": "16:00",
                    "bookableNum": 1,
                    "bookedNum": 0
                }
            ]
        }
    ]
};
// myResponse = myResponse.replace(/\"bookingDate":"\d{4}年\d{1,2}月\d{1,2}日\s星期[一二三四五六日]"/, '\"bookingDate": "'+formattedDate+'"');

$done(myResponse);
