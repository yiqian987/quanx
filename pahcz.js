/**
* @fileoverview Example to compose response for rewrite of script-echo-response.
*
* $request.url, $notify(title, subtitle, message), console.log(message), $done(response)
*
* @supported Quantumult X (v1.0.3-build141)
*/

const myStatus = "HTTP/1.1 200 OK";

const myHeaders = {"Server": "loading", "Content-Type": "application/json", "Connection": "keep-alive"};

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
// const myData = '{"code":200,"msg":"OK","data":[{"storefrontSeq":"39807","bookingDate":formattedDate,"businessType":"14","totalBookableNum":5,"totalBookable":5,"totalBooked":0,"bookingRules":[{"idBookingSurvey":"c92a666fb46a46a8b1e4858890fff22c","startTime":"9:00","endTime":"10:00","bookableNum":1,"bookedNum":0},{"idBookingSurvey":"718946a308c349a9a3dbcbc39455a59e","startTime":"10:00","endTime":"11:00","bookableNum":1,"bookedNum":0},{"idBookingSurvey":"0562b1b8f35449a288d6cb446cfbc61e","startTime":"11:00","endTime":"12:00","bookableNum":1,"bookedNum":0},{"idBookingSurvey":"cdd7342776da4367b0c3ffe397ae2b2a","startTime":"14:00","endTime":"15:00","bookableNum":1,"bookedNum":0},{"idBookingSurvey":"b3f877f644024ac7b87c8569a446c74c","startTime":"15:00","endTime":"16:00","bookableNum":1,"bookedNum":0}]}]}';
const myData = JSON.stringify({
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
});

const myResponse = {
    status: myStatus,
    headers: myHeaders,
    body: myData
};

$done(myResponse);
