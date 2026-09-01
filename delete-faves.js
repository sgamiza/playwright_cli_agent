async page => {
  var bankKeywords = ['银行', '储蓄', '农信', '信用社', '农商'];

  var toDeleteNames = [
    'Example Park',
    'Example Museum',
    'Example Shopping Mall',
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
