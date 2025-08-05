// ==UserScript==
// @name         Captcha Notify Logger
// @namespace    http://pingan.com.cn/
// @version      1.0
// @description  拦截验证码请求体并通过通知打印内容
// @author       YourName
// @match        https://newretail.pingan.com.cn//ydt/captcha/validate/*
// ==/UserScript==

if ($request.method === "POST") {
  let body = $request.body;

  try {
    let json = JSON.parse(body);
    let phone = json.phoneNumber || "未提供";
    let challenge = json.challenge || "";
    let validate = json.validate || "";
    let seccode = json.seccode || "";
    let captchaId = json.captchaId || "";

    let title = "验证码请求拦截";
    let subtitle = "手机号: " + phone;
    let detail = `challenge: ${challenge}\nvalidate: ${validate}\nseccode: ${seccode}\ncaptchaId: ${captchaId}`;

    $notify(title, subtitle, detail);
  } catch (e) {
    $notify("验证码请求拦截", "请求体非 JSON 格式", body);
  }
}

$done({});
