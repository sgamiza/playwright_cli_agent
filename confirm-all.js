async page => {
  var result = await page.evaluate(function() {
    var buttons = document.querySelectorAll('.f-modal .ok');
    var n = buttons.length;
    buttons.forEach(function(btn) { btn.click(); });
    return n + ' 个确定按钮已全部点击';
  });
  await page.waitForTimeout(3000);
  var remaining = await page.evaluate(function() {
    return document.querySelectorAll('.f-modal').length;
  });
  return result + '，剩余弹窗：' + remaining;
}
