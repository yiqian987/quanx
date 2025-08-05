/*************************************

项目名称：平安好车主
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

[rewrite_local]
^https?:\/\/newretail\.pingan\.com\.cn/ydt/captcha/validate\?.* url script-request-body https://raw.githubusercontent.com/yiqian987/quanx/main/pahcz_validate.js
^https?:\/\/newretail\.pingan\.com\.cn/ydt/captcha/validate\?.* url 302 https://fake.cateyestar.com:2443
[mitm]
hostname = newretail.pingan.com.cn

*************************************/

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

