/*************************************

项目名称：人大访客预约（guest.ruc.edu.cn）v1
使用声明：⚠️仅供参考，🈲转载与售卖！

解决三件事（都是前端展示层，不动服务端数据）：
  1. 入校须知弹窗每次都弹（还要等 5 秒倒计时）→ 去掉
  2. 可预约日期"已满"是灰的 → 全部点亮成"可登记"（像 redfriday 那样）
  3. 表单下拉框每次要手选 → 预约校门 / 入校事由 / 日期 自动带出默认值

用法：QuanX 的 rewrite 远程引用里加上本文件：
      https://raw.githubusercontent.com/yiqian987/quanx/main/ruc.js

      本文件是这个小程序的唯一主文件，后续更新只改这里。

**************************************

[rewrite_local]
^https?:\/\/guest\.ruc\.edu\.cn\/visitor\/ui\/v1\/mobileVisitorService\/getAdmissionNotice url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/ruc.js
^https?:\/\/guest\.ruc\.edu\.cn\/visitor\/ui\/v1\/mobileVisitorService\/getOrderDateAvailable url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/ruc.js
^https?:\/\/guest\.ruc\.edu\.cn\/visitor\/static\/js\/chunk-[^\/]*\.js url script-response-body https://raw.githubusercontent.com/yiqian987/quanx/main/ruc.js

[mitm]
hostname = guest.ruc.edu.cn

*************************************/

(function () {
  // ---- 可调开关 ----
  var NOTICE_ENABLE = true;   // 去掉入校须知弹窗
  var DATE_ENABLE = true;     // 日期全部点亮为"可登记"
  var FORM_ENABLE = true;     // 表单下拉框自动带出默认值
  var DEFAULT_PURPOSE = '参访游玩';  // 入校事由默认值（可选：会议培训/运动学习/面试考试/维护保障/其他事由）

  var body = ($response && $response.body) || '';
  var url = String(($request && $request.url) || '');
  var out = body;

  try {
    // =====================================================================
    // 一、入校须知弹窗：getAdmissionNotice
    // ---------------------------------------------------------------------
    // 前端这段逻辑（chunk-6bd7b5f7，已读原文确认）：
    //     case 3: t = e.sent,
    //             i = t.data,
    //             this.dialogNotesData = i.admission,
    //             this.dialogVisible = !0,
    //             this.timer = setInterval(...1e3)     // readTime 从 5 开始倒数
    // 弹窗按钮是 disabled:!!readTime，必须等满 5 秒才能点"已阅读"。
    //
    // 关键：它无条件把 dialogVisible 置 true。所以只把 admission 清空没用——
    // 照样弹一个空白框 + 5 秒倒计时。
    //
    // 正确做法：把 data 置成 null。i 为 null 时 `i.admission` 抛 TypeError，
    // 被生成器自己的 catch(0) 捕获，直接跳到 end ⇒ dialogVisible 保持 false。
    // 该请求是 mounted 的最后一步，前面几个接口都已跑完，异常不影响任何数据。
    // =====================================================================
    if (NOTICE_ENABLE && url.indexOf('getAdmissionNotice') >= 0 && body) {
      var on = JSON.parse(body);
      if (on && 'data' in on) {
        on.data = null;
        out = JSON.stringify(on);
      }
    }

    // =====================================================================
    // 二、可预约日期点亮：getOrderDateAvailable
    // ---------------------------------------------------------------------
    // 前端置灰与可选判定（同一 chunk 原文）：
    //     class: isBefore6AM() && r === reverseDate.length-1 || "可登记" !== t.status
    //            ? "could_not_style" : ""
    //     chooseDate: isBefore6AM() && t === len-1 || "可登记" === e.status
    //            && (this.currentDate = e.date)
    // ⇒ 只认 "可登记" 这一个值，把 status 全改成它就同时点亮 + 可选。
    //
    // ⚠️ 这是纯前端改动：服务端那天的名额并不会变多。点"已满"的日期去提交，
    //    大概率会被服务端拒绝（返回已满）。能提交成功的仍然只有原本可登记的日子，
    //    但至少不会有"明明能约却显示灰色"的情况，也不会再出现服务端还没刷新
    //    导致的假灰。
    // =====================================================================
    if (DATE_ENABLE && url.indexOf('getOrderDateAvailable') >= 0 && body) {
      var od = JSON.parse(body);
      if (od && od.data && od.data.length) {
        for (var k = 0; k < od.data.length; k++) {
          if (od.data[k] && typeof od.data[k] === 'object') {
            od.data[k].status = '可登记';
          }
        }
        out = JSON.stringify(od);
      }
    }

    // =====================================================================
    // 三、表单下拉框自动带出：改预约页的 chunk JS
    // ---------------------------------------------------------------------
    // 新预约路径（URL 带 parkId）里，mounted 依次跑
    //   getTimeAndInfo → getReverseDate → getPurposeData → getPrivilegeList → getNotesData
    // 四个接口只负责填充可选项，**没有任何接口回填默认值**；
    // 只有"修改预约"（URL 带 visitBatch，走 getRegisterData）才会回填。
    // 所以新预约想自动带出，只能在 JS 里给默认值。三处最小改动：
    //
    //   1) data() 初始值 visitPurpose:""  → 默认事由（入校事由是只读 van-field，
    //      点开才选；给它初值就等于已经选好）
    //   2) getPrivilegeList 之后：privilegeList 有值就默认选中第一个校门
    //      （服务端 rows[0] 就是 isDefault:1 的那个）
    //   3) getReverseDate 之后：默认选中第一个"可登记"的日期
    //
    // 全部用 IIFE 包在 try/catch 里插进原有的逗号表达式链，改不动就原样放行。
    // =====================================================================
    if (FORM_ENABLE && url.indexOf('/visitor/static/js/') >= 0 && body) {
      // ---- 1) 入校事由默认值 ----
      var anchor1 = 'privilegeGroupName:"",privilegeGroupIds:[],visitPurpose:"",inputPurpose:""';
      if (body.indexOf(anchor1) >= 0) {
        out = out.replace(
          anchor1,
          'privilegeGroupName:"",privilegeGroupIds:[],visitPurpose:"' +
            DEFAULT_PURPOSE + '",inputPurpose:""'
        );
      }

      // ---- 2) 预约校门默认选第一个 ----
      var anchor2 =
        'this.privilegeList=i.rows.map(function(e){return{text:e.privilegeGroupName,value:e.privilegeGroupId}}),';
      if (out.indexOf(anchor2) >= 0) {
        out = out.replace(
          anchor2,
          anchor2 +
            '(function(r){try{if(r.privilegeList.length&&(!r.privilegeGroupIds||!r.privilegeGroupIds.length)){' +
            'r.privilegeGroupIds=[{privilegeGroupId:r.privilegeList[0].value}];' +
            'r.privilegeGroupName=r.privilegeList[0].text;}}catch(e){}})(this),'
        );
      }

      // ---- 3) 日期默认选第一个可登记的 ----
      var anchor3 = 'this.reverseDate=i||[],';
      if (out.indexOf(anchor3) >= 0) {
        out = out.replace(
          anchor3,
          anchor3 +
            '(function(r){try{var a=(r.reverseDate||[]).filter(function(d){return d&&"可登记"===d.status});' +
            'if(a.length&&!r.currentDate)r.currentDate=a[0].date;}catch(e){}})(this),'
        );
      }
    }
  } catch (err) {
    out = body;   // 任何一步拿不准就原样放行，绝不猜
  }

  $done({ body: out });
})();
