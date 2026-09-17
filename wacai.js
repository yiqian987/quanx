/*************************************

项目名称：挖财记账 v5（去广告 + 去埋点 + 关掉 VIP 伪装，引用不变）
使用声明：⚠️仅供参考，🈲转载与售卖！

**************************************

【v3 的用法：你什么都不用改】

远程引用还是原来那个 wacai.js。规则段只**新增**了一条埋点拦截行排在前面，
整域名兜底那条原样保留；脚本段仍在内部按 URL 分支处理广告位。
所以在 QuanX 里刷新一下远端资源就生效，不用删引用、不用重导。

v4/v5 额外变化：**默认关掉了老版本遗留的 12 条 VIP 字段伪装**（详见下面【v5】），
怀疑它就是"自定义封面按钮消失"的原因。

**************************************

【v5（2026-09-18）：关掉 VIP 伪装 —— 并更正 v4 里一处推断错误】

用户实测纠正：**`vipRightType` 根本不是付费开关，50 个预设封面随便用**。
前面【三】里"换封面是付费权益"的结论是错的，作废。

**v4 曾推断：`cover/list` 的 `isVipMember` 被脚本改成 true，导致自定义按钮消失。
这条推断已被 HAR 数据证伪 —— 事实是它当时压根没被改过。**

09-17 22:35 那份 HAR 里，`/api/book/cover/list`（#101 / #102）记录的
`isVipMember` **就是 false**，是服务端原值。同一份 HAR 里 `my/v3`、
`userInfo`、`vipmember/v3/index` 却是被改过的（isVipMember:true、isVip:1 …）。

差别在哪？那一刻 iPad 上真正生效的是 **chxm1023 原版的路径白名单规则** ——
它只收三个路径族：`api/my/v\d`、`api/vipmember/v\d/index`、`api/usercenter/userInfo`
（外加 jz-activity 下的 `api/vipmember/v\d/index`），不是整域名兜底。

被改的 7 条 100% 落在这张白名单内；`cover/list`、`vipmember/v3/goods` 不在名单内，
所以原样放行。⇒ **自定义封面按钮坏了跟脚本无关，用户说"之前就坏了"属实。**

那为什么还要关？因为 **v2 之后本文件（整域名兜底）才在用户设备上真正生效**
（开屏广告消失就是证据）。从那一刻起，`cover/list` 才开始会被改成
`isVipMember:true` —— 这是个**新增**的风险，不是历史原因。

    { "data": { "bookCovers": [ ...50 个... ], "isVipMember": false } }

该接口**只有两个字段**、不下发任何"自定义"入口 ⇒ 按钮由前端按身份字段切分支，
伪造成会员有让按钮消失的嫌疑。而会员权益本身服务端 RSA-1024 验签，
伪造从来拿不到真东西（见【三】）⇒ 关掉它**零损失**，顺带排除这个嫌疑。

代码一行没删，脚本顶部 `VIP_ENABLE` 改成 true 可完整恢复。

顺带一个实证结论：**QuanX 的 script-response-body 能正常处理 gzip 响应**
（开屏广告接口 `newSplash` 的 Content-Encoding 就是 gzip，改写照样生效），
不用为 gzip 单独想办法。

**************************************

【一、2026-09-17 HAR 实测：广告到底慢在哪】

138 条请求 / 54 秒。启动时间线（相对第一条请求）：

    +0.03s  POST /api/banners/newSplash      下发 2 条开屏广告
                                             advertiseSeconds 5 -> 5 秒倒计时
                                             advertiseSeconds 3 -> 3 秒倒计时
    +0.56s  GET  穿山甲广告 SDK bundle.js    11KB（因上面下发了广告才去拉）
    +0.97s  首页数据开始加载
    +2.58s  首页数据请求告一段落
    +5.24s  才开始拉 userInfo  <- 中间 2.66 秒空档，人看到的就是广告

⇒ 启动约 5.2 秒，其中 2.7~5 秒耗在开屏广告上。

**决定性证据**：同一份 HAR 里 #54 那次 newSplash，服务端自己返回的就是
`advertiserSplashList: null`，而 App 在 **0.02 秒后**就继续往下走了 ——
说明「返回空广告 = 直接进首页，不会有任何等待」。v2 就是照这个形态改的。

其余广告位（都在 jz 域名下，本次抓到的实际内容）：

    /api/banners/ribbon?type=7          首页飘带，url = wacai://ad_store_saas
    /api/banners/list?typeId=37         banner 分组（本次为空）
    /api/resource/universal/fetch       运营位下发，其中
                                          spaceKey=HomeInterstitialAd 首页插屏
                                          spaceKey=HomepageIcon      首页图标位

**************************************

【二、v3 改了什么（脚本内按 URL 分支 + 一条埋点拦截，其余原样放行）】

| URL | 处理 |
|---|---|
| `/api/banners/newSplash` | `advertiserSplashList` 置 `null`（= 服务端"今天没广告"的原话） |
| `/api/banners/ribbon` | `banners` 置空数组 |
| `/api/banners/list` | 清掉 url 以 `wacai://ad_` 开头的条目，功能入口保留 |
| `/api/resource/universal/fetch` | 插屏位 `HomeInterstitialAd` 的 resources 清空；其余位只过滤 `wacai://ad_` |
| 其它一切请求 | 原样放行 |

两个刻意的选择：

1. **不用 reject 拦广告 SDK**。SDK 是因为开屏广告下发了才去拉的，
   把广告列表置空后它就不会加载了 —— 比直接 reject 域名安全得多，
   不会因为 SDK 初始化失败把 App 搞崩。
2. **只过滤 `wacai://ad_` 前缀**，不清空整个运营位。
   这些位里混着正常功能入口，一刀切会误杀。

**v3 新增：埋点上报直接拦掉**（用户 2026-09-17 要求）。

HAR 实测 7 条，全是同一个神策（SensorsData）上报接口：

    POST https://jz.wacaijizhang.com/sensor/sa?project=jizhang
    请求体 crc=...&gzip=1&data_list=<base64 gzip 后的行为数据>
    单次 1.0~3.4KB，合计 9.9KB；响应 200 / 0B / text/plain（本来就是空的）

处理：规则段加一行把它本地拒掉。选 `reject-200` 而不是 `reject` ——
SDK 收到 200 会认为上报成功、丢弃本地缓存；直接断连接会触发它的重试和
缓存堆积，反而更费流量。这也和它原本的响应形态（200 空响应）完全一致。

**************************************

【三、关于原有的 VIP 字段改写：实测只在前端生效，别抱期待】

v1 那 12 条 replace（`isVip` / `vipType` / `adFreeVipEnable` …）代码**一行没删**，
但 v4 起用 `VIP_ENABLE = false` 默认**关掉**了，理由见【v5】。

下面是 2026-09-17 那份 HAR 的逐条实测（开着 VIP_ENABLE 时的行为，存档备查）：

    被改成功的（前端显示层）：
      /api/usercenter/userInfo         isVip:1                （5 处命中）
      /api/my/v3                       isVipMember:true       （2 处）
      会员页 vipmember/v3/index        vipType:2 / adFreePermanentVip:true …

    ❌ 改不动的（真正管权益的那个）：
      /api/vipmember/index/sign        vipInfo 全部保持 0 / false

为什么改不动：sign 接口把整段用户信息**转义塞进一个字符串字段**里，
还附了服务端 `sign` 签名。正则匹配不到被转义的 `\"vipType\":0`，
就算改了，验签也过不了。

结论：**前端几个页面会显示成会员，但服务端仍然按非会员对待** ——
所以开屏广告照发、会员功能照旧用不了。这不是脚本没跑，是那条路走不通。

**************************************

【四、v3 之外没有做的几件事（记在这里免得以后重复问）】

    vipRightType 1 -> 0           不需要 —— 用户实测：它根本不是付费开关，50 个封面随便用
                                  （v3 及更早在这里写错了，结论作废）
    伪造 sign 接口的验签          做不到，需要服务端密钥（RSA-1024，7 天一换）
    拿别人的会员 sign 顶替        不做 —— 冒用他人付费身份，且最多 7 天就失效
    把 cover 大图替换成缩略图     没做，会显著降低预览质量（需要可自行加，见脚本末尾注释）

**************************************

【五、流量账（顺带一提）】

s1.wacdn.com 共 **33 张图 / 4.35 MB**，集中在打开"换封面"页的 3 秒内：

    wis/540   7 张  2838KB   <- 单张最大 471KB
    wis/542   6 张   467KB
    wis/543  12 张   749KB
    wis/541   8 张   397KB

另外 App 自己有重复拉取：`custom-view/list`、`tool/list`、`budget/query/all`
各 8 次，`account/sync/list` 4 次，`vipmember/index/sign` 6 次。
这些是客户端行为，rewrite 层面不该拦（拦了容易白屏），只能等 App 自己优化。

**************************************

[rewrite_local]
^https?:\/\/jz\.wacaijizhang\.com\/sensor\/sa url reject-200
^https?:\/\/jz\.wacaijizhang\.com url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/wacai.js

[mitm]
hostname = jz.wacaijizhang.com

第一条是 v3 新增：神策埋点上报，直接本地回 200 空响应，请求根本发不出去。
必须排在整域名兜底**前面** —— QX 只命中第一条，排后面会被兜底吃掉、等于没写。

兜底那条与 v1/v2 完全一致，因此**不需要换引用、不需要删旧引用**。
⚠️ 反过来说：正因为它是整域名兜底，如果你另外还引用了别的 jz 域名脚本，
两者必然互相抢 —— 引用列表里 wacai 系列只保留这一个文件即可。

回滚：git 回到本文件上一个 commit，或在脚本里把 AD_ENABLE 改成 false。

*************************************/


// 加固沿革：
//  - v2（2026-09-17）：原版是裸写 body.replace，$response.body 为 null/undefined 时
//    replace 直接抛 TypeError => $done 永不调用 => QX 挂住请求直到 App 超时，
//    HAR 里表现为 status 0 / 响应头为空 / timings 全 -1。现在统一 IIFE + try/catch，
//    最坏也只是原样放行，绝不挂请求。
//  - v2 新增广告位处理（按 URL 分支），原有 12 条 VIP replace 一行未动。
//  - v3（2026-09-17）规则段新增神策埋点 `/sensor/sa` 的本地拒止，排在兜底规则
//    前面 ⇒ 埋点根本不会进本脚本，脚本段一行没改。用 reject-200 而非 reject：
//    SDK 收到 200 才认为上报成功并丢缓存，断连接会让它重试 + 堆积。
//  - v4/v5（2026-09-18）**默认关掉 v1 遗留的 12 条 VIP 伪装**（VIP_ENABLE=false）。
//    原因见文件头【v5】一节。要点更正：09-17 的 HAR 里 `cover/list` 的 `isVipMember`
//    其实**没被改过**（记录的仍是 false），因为抓包那一刻生效的是 chxm1023 的
//    路径白名单而非本文件的整域名兜底 —— 所以"按钮坏了"不是本脚本的历史锅。
//    但本文件生效后它**会**被改成 true，属新增风险；且会员权益服务端 RSA-1024
//    验签、伪造从来无效 ⇒ 关掉零损失。
(function () {
  var AD_ENABLE = true;    // 改成 false 即只保留 v1 行为
  var VIP_ENABLE = false;  // v4 起默认关：VIP 伪装无实际权益，且有副作用嫌疑（v5 更正理由）
  var body = ($response && $response.body) || '';
  var url = String(($request && $request.url) || '');
  var out = body;

  function isAd(u) { return !u || String(u).indexOf('wacai://ad_') === 0; }

  // 只改认识的结构，任何一步拿不准就原样返回，绝不猜
  function edit(fn) {
    var o = JSON.parse(body);
    var r = fn(o);
    return r ? JSON.stringify(o) : body;
  }

  try {
    // ---- v1 原有逻辑：12 条 VIP 字段伪装 ----
    // v4 起默认关闭（VIP_ENABLE=false），详见文件头【v5】一节。
    // 想恢复老行为把它改回 true 即可，代码一行没删。
    if (VIP_ENABLE) {
      out = out.replace(/\"isVip":\d+/g, '\"isVip":1');
      out = out.replace(/\"sex":"\d+"/g, '\"sex":"1"');
      out = out.replace(/\"isPermanentVip":\w+/g, '\"isPermanentVip":true');
      out = out.replace(/\"freeSendVipEnable":\d+/g, '\"freeSendVipEnable":1');
      out = out.replace(/\"freeSendAdFreeVipEnable":\d+/g, '\"freeSendAdFreeVipEnable":1');
      out = out.replace(/\"vipType":\d+/g, '\"vipType":2');
      out = out.replace(/\"expireDaysDays":\d+/g, '\"expireDaysDays":99999');
      out = out.replace(/\"vipMemberEnable":\d+/g, '\"vipMemberEnable":1');
      out = out.replace(/\"adFreePermanentVip":\w+/g, '\"adFreePermanentVip":true');
      out = out.replace(/\"matchVipTrial":\w+/g, '\"matchVipTrial":true');
      out = out.replace(/\"adFreeVipEnable":\d+/g, '\"adFreeVipEnable":1');
      out = out.replace(/\"isVipMember":\w+/g, '\"isVipMember":true');
    }

    // ---- v2 新增：广告位 ----
    if (AD_ENABLE) {
      if (url.indexOf('/api/banners/newSplash') >= 0) {
        // 置 null 而不是 []：服务端自己就是这么返回的（见 HAR #54），App 认得
        out = edit(function (o) {
          if (!o || !o.data || !o.data.advertiserSplashList) return false;
          o.data.advertiserSplashList = null;
          if (o.data.vipUrl) o.data.vipUrl = null;
          return true;
        });
      } else if (url.indexOf('/api/banners/ribbon') >= 0) {
        out = edit(function (o) {
          if (!o || !o.banners || !o.banners.length) return false;
          o.banners = [];
          return true;
        });
      } else if (url.indexOf('/api/banners/list') >= 0) {
        out = edit(function (o) {
          if (!o || !o.data || !o.data.groups) return false;
          var hit = false;
          o.data.groups.forEach(function (g) {
            if (g && g.banners && g.banners.length) {
              var keep = g.banners.filter(function (b) { return !isAd(b && b.url); });
              if (keep.length !== g.banners.length) { g.banners = keep; hit = true; }
            }
          });
          return hit;
        });
      } else if (url.indexOf('/api/resource/universal/fetch') >= 0) {
        out = edit(function (o) {
          if (!o || !o.data) return false;
          var hit = false;
          o.data.forEach(function (sp) {
            if (!sp) return;
            if (sp.spaceKey === 'HomeInterstitialAd') {
              if (sp.resources && sp.resources.length) { sp.resources = []; hit = true; }
              return;
            }
            if (sp.resources && sp.resources.length) {
              var keep = sp.resources.filter(function (r) { return !isAd(r && r.url); });
              if (keep.length !== sp.resources.length) { sp.resources = keep; hit = true; }
            }
          });
          return hit;
        });
      }
      // 可选（默认不开）：想把封面大图换成缩略图省流量，在这里加
      //   else if (url.indexOf('/api/book/cover/list') >= 0) {
      //     out = edit(function (o) {
      //       if (!o || !o.data || !o.data.bookCovers) return false;
      //       o.data.bookCovers.forEach(function (c) {
      //         if (c.coverPreUrl) c.imageUrl = c.coverPreUrl;   // 90x114 缩略图
      //       });
      //       return true;
      //     });
      //   }
      // 代价是封面预览变模糊，且这属于画质降级而非加速，故默认不动。
    }
  } catch (e) {
    out = body;
  }

  $done({ body: out });
})();
