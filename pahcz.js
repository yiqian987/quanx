/**
* @fileoverview Example to compose response for rewrite of script-echo-response.
*
* $request.url, $notify(title, subtitle, message), console.log(message), $done(response)
*
* @supported Quantumult X (v1.0.3-build141)
*/

const myStatus = "HTTP/1.1 200 OK";
const myHeaders = {"Location": "https://www.baidu.com"};
const myData = "Here we go.";

const myResponse = {
    status: myStatus,
    headers: myHeaders, // Optional.
    body: myData // Optional.
};

$done(myResponse);
