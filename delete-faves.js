async page => {
  var bankKeywords = ['银行', '储蓄', '农信', '信用社', '农商'];

  var toDeleteNames = [
    '杭州西湖风景名胜区-保俶塔',
    '杭州西湖风景名胜区-抱朴道院',
    '杭州沿江湿地公园-西区',
    '灵隐寺', '北高峰', '法华寺',
    '杭州半山国家森林公园',
    '良渚古城遗址公园',
    '龙坞茶园',
    '宝石山游步道',
    '千年古村方家河头（入口）',
    '千年古村方家河头停车场',
    '径山寺', '杭州湾国家湿地公园', '郑徐水库公园',
    '栲栳山风景区', '龙鳞坝',
    '云岚居庄园·团建露营·草坪婚礼·杭州好莱坞',
    '麻车头村露营点', '双溪漂流（公交站）', '半山娘娘庙（装修中）',
    '浙江大学医学院附属第二医院滨江院区',
    '杭州市第三医院门诊', '杭州市儿童医院',
    '慈铭体检（滨江分院）', '慈铭体检凯旋分院',
    '瑞尔齿科（杭州大厦店）', '杭州瑞尔口腔门诊部',
    '九格眼镜·蔡司官方授权店（地铁商务大厦店）',
    '杭州城北万象城', '杭州收藏品市场', '海外海·杭州商城',
    '快乐猴超市（拱墅大关路店）', '大润发（何山店）', '迪卡侬（大关店）',
    '麦当劳（杭州黄龙世纪广场）', '麦当劳（杭州西湖文化广场）',
    '大悦城购物中心', '黄龙世纪广场A座', '江南春',
    '妈妈菜（凯虹广场店）', '食牛堂家常菜馆（西湖文化广场店）',
    '黄龙洞（地铁站）', '花坞（地铁站）', '笕桥老街（地铁站）',
    '杭州青少年活动中心', '杭州市拱墅区城北少年宫', '拱墅区青少年活动中心',
    '杭州市拱墅区图书馆', '杭州市大成实验学校', '玛丽英语（城中武林府校区）',
    '上城区闸弄口街道蓝天社区干休所幸福邻里食堂',
    '上城区闸弄口街道机神社区幸福邻里食堂',
    '濮家社区幸福邻里食堂',
    '浙江人力社保大楼', '杭州君悦酒店', '杭州滨江开元名都大酒店',
    'Nokia 上海贝尔', '诺基亚通信创新软件园', '浙江杭钢动力有限公司',
    '杭州钱江新城市民中心J座', '浙江图书馆自助还书服务',
    '黄龙世纪苑1幢', '白鹭郡·南秋荷坊174幢', '白鹭郡南·秋荷坊（东南门）',
    '秋荷坊2期', '湖墅新村23幢', '杭州动物园停车点',
    '千岛湖洲际度假酒店', '桐庐县', '浙江省杭州市富阳区',
  ];

  function shouldDelete(title, bankKeywords, toDeleteNames) {
    var isBank = bankKeywords.some(function(kw) { return title.indexOf(kw) !== -1; });
    if (isBank) return false;
    return toDeleteNames.some(function(name) {
      return title === name || title.indexOf(name) !== -1 || name.indexOf(title) !== -1;
    });
  }

  var deleted = [];

  for (var pageNum = 1; pageNum <= 2; pageNum++) {
    if (pageNum === 2) {
      try {
        await page.evaluate(function() {
          var btn = document.querySelector('.iconfont.icon-chevronright');
          if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
      } catch(e) { break; }
    }

    // 每次重新获取列表（因为删除后DOM会变化）
    var keepGoing = true;
    while (keepGoing) {
      keepGoing = false;
      var items = await page.$$('li.favitem');
      for (var i = 0; i < items.length; i++) {
        var titleEl = await items[i].$('.favtitle');
        if (!titleEl) continue;
        var title = (await titleEl.innerText()).trim();

        if (!shouldDelete(title, bankKeywords, toDeleteNames)) continue;

        // 点击删除按钮
        var delBtn = await items[i].$('.favdel');
        if (!delBtn) continue;

        await page.evaluate(function(btn) {
          btn.click();
        }, delBtn);

        // 等待确认弹窗出现
        try {
          await page.waitForSelector('.f-modal .ok', {timeout: 3000});
          // 点击确定
          await page.evaluate(function() {
            var okBtn = document.querySelector('.f-modal .ok');
            if (okBtn) okBtn.click();
          });
          // 等待弹窗消失
          await page.waitForSelector('.f-modal', {state: 'detached', timeout: 5000});
          deleted.push(title);
          await page.waitForTimeout(300);
          keepGoing = true; // 重新扫描列表
          break;
        } catch(e) {
          // 弹窗没出现或超时，继续
        }
      }
    }
  }

  return '✅ 全部完成！共删除 ' + deleted.length + ' 个收藏：\n' + deleted.join('\n');
}
