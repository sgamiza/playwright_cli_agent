---
name: amap-favorites
description: >
  查询、导出、删除高德地图收藏夹（我的收藏）。使用 playwright-cli --persistent
  持久化保存登录状态，登录一次后无需重复扫码。
  触发词：高德收藏、amap收藏、查看高德收藏、导出地图收藏、我的收藏高德、删除高德收藏。
allowed-tools: Bash(playwright-cli:*) Bash(npx:*)
---

# 高德地图收藏夹 Skill

## 功能

- 自动打开高德地图收藏页（`https://www.amap.com/faves`）
- 使用 `--persistent` 保持登录状态，**登录一次永久有效**（直到 Cookie 过期）
- 翻页提取全部收藏地点，整理成 CSV 文件
- 支持批量删除收藏地点

---

## ⚠️ 关键原则：始终使用 `--persistent`

```bash
# ✅ 正确：使用持久化 profile，Cookie 跨会话保留
playwright-cli open https://www.amap.com/faves --persistent --head

# ❌ 错误：不要用 Start-Process + attach --cdp，那种方式不持久化 Cookie
```

`--persistent` 会把 Cookie/localStorage 保存在 playwright-cli 的默认持久化目录，
下次再运行时自动读取，**无需重新扫码登录**。

---

## 完整流程

### 第一步：打开收藏页（持久化会话）

```bash
playwright-cli open https://www.amap.com/faves --persistent --head
playwright-cli screenshot --filename=amap-check.png
```

截图后判断是否已登录：
- **已登录**（左侧出现收藏列表）→ 直接跳到第三步
- **未登录**（显示登录弹窗）→ 执行第二步

---

### 第二步：扫码登录（仅首次或 Cookie 过期时）

```bash
# 找到二维码登录 Tab 并点击（ref 号可能每次不同，用快照确认）
playwright-cli snapshot --depth=4
# 找到 "二维码登录" 对应的 ref，例如 e156，点击它
playwright-cli click e156

# 截图展示给用户扫码
playwright-cli screenshot --filename=amap-qrcode.png
```

等用户用手机高德 App 扫码确认后，继续下一步。
**登录成功后 Cookie 自动保存到持久化 profile，下次无需重新登录。**

---

### 第三步：提取收藏列表（翻页）

```bash
# 等待页面加载后截图确认
playwright-cli screenshot --filename=amap-faves-p1.png

# 获取当前页所有收藏
playwright-cli eval "[...document.querySelectorAll('li h4, li .sub-title')].map(el => el.innerText.trim()).filter(t=>t).join('\n')"

# 查看分页状态（找 "X/Y页" 文本）
playwright-cli snapshot --depth=3
```

**翻下一页**（若显示 `X/Y页` 且 X < Y）：

```bash
playwright-cli click ".iconfont.icon-chevronright"
playwright-cli eval "[...document.querySelectorAll('li h4, li .sub-title')].map(el => el.innerText.trim()).filter(t=>t).join('\n')"
```

---

### 第四步：整理为 CSV 并保存（UTF-8 BOM）

收集所有页数据后，用 Write 工具保存 CSV，再用 PowerShell 添加 BOM：

```
序号,名称,城市/地区,类别
1,锦里古街,成都,景点
...
```

**类别参考**：景点、餐饮、购物、住宿、医疗、银行、交通、教育、工作、住宅、政务、地区标记、其他

```bash
# 保存后转换为 UTF-8 BOM（Excel 可直接打开不乱码）
$content = Get-Content "amap_favorites.csv" -Encoding UTF8 -Raw
$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText("$PWD\amap_favorites_utf8bom.csv", $content, $utf8BOM)
```

---

### 第五步：批量删除收藏（可选）

#### 页面关键 DOM 结构

```html
<li class="favitem">
  <div class="favinfo">
    <h4 class="favtitle">地点名称</h4>
  </div>
  <div class="favctrl">
    <span class="favdel">删除</span>   <!-- 平时隐藏，hover 后可见，但可直接 JS click -->
  </div>
</li>

<!-- 点击 .favdel 后弹出确认框 -->
<div class="f-modal">
  <h2>删除收藏</h2>
  <div class="f-label">确定删除该收藏？</div>
  <div class="f-foot">
    <span class="cancel">取消</span>
    <span class="ok">确定</span>   <!-- 点此确认删除 -->
  </div>
</div>
```

#### ⚠️ 删除三大注意事项

1. **`.favdel` 按钮平时隐藏**（CSS hidden），但可以用 `dispatchEvent` 或 `evaluate` 直接触发 JS click，无需先 hover。
2. **每次删除都会弹出 `.f-modal` 确认框**，必须点击 `.f-modal .ok` 才能真正删除，不能跳过。
3. **必须逐条删除**，不能同时触发多个删除——多个 `.f-modal` 叠加后点击会失效（所有弹窗的 click 都无响应）。

#### 批量删除脚本模板（`delete-faves.js`）

```javascript
async page => {
  var bankKeywords = ['银行', '储蓄', '农信', '信用社', '农商'];

  // 填入要删除的地点名称（精确匹配或包含匹配）
  var toDeleteNames = [
    '地点名称1',
    '地点名称2',
    // ...
  ];

  function shouldDelete(title) {
    var isBank = bankKeywords.some(function(kw) { return title.indexOf(kw) !== -1; });
    if (isBank) return false;
    return toDeleteNames.some(function(name) {
      return title === name || title.indexOf(name) !== -1 || name.indexOf(title) !== -1;
    });
  }

  var deleted = [];

  // 处理每一页（最多2页，每页100条）
  for (var pageNum = 1; pageNum <= 2; pageNum++) {
    if (pageNum === 2) {
      await page.evaluate(function() {
        var btn = document.querySelector('.iconfont.icon-chevronright');
        if (btn) btn.click();
      });
      await page.waitForTimeout(2000);
    }

    // 循环扫描：每次删一条后重新获取列表（DOM 会变化）
    var keepGoing = true;
    while (keepGoing) {
      keepGoing = false;
      var items = await page.$$('li.favitem');

      for (var i = 0; i < items.length; i++) {
        var titleEl = await items[i].$('.favtitle');
        if (!titleEl) continue;
        var title = (await titleEl.innerText()).trim();
        if (!shouldDelete(title)) continue;

        // 触发删除按钮（绕过 CSS 隐藏）
        var delBtn = await items[i].$('.favdel');
        if (!delBtn) continue;
        await page.evaluate(function(btn) { btn.click(); }, delBtn);

        // 等待确认弹窗出现，点击确定
        await page.waitForSelector('.f-modal .ok', { timeout: 3000 });
        await page.evaluate(function() {
          document.querySelector('.f-modal .ok').click();
        });

        // 等待弹窗消失（表示删除成功）
        await page.waitForSelector('.f-modal', { state: 'detached', timeout: 5000 });
        deleted.push(title);
        await page.waitForTimeout(300);

        keepGoing = true;  // 重新扫描（防止 DOM 索引错位）
        break;
      }
    }
  }

  return '✅ 删除完成，共删除 ' + deleted.length + ' 个：\n' + deleted.join('\n');
}
```

执行：

```bash
playwright-cli run-code --filename=delete-faves.js
```

---

## 关键选择器速查

| 元素 | 选择器 |
|------|--------|
| 用户登录区域 | `#loginbox` |
| 用户头像（未登录） | `.avatar.logintip` |
| 用户面板菜单 | `.user-panel` |
| 收藏列表容器 | `li.favitem` |
| 收藏地点名称 | `li.favitem .favtitle` |
| 删除按钮（隐藏） | `li.favitem .favdel` |
| 确认弹窗容器 | `.f-modal` |
| 确认弹窗"确定"按钮 | `.f-modal .ok` |
| 确认弹窗"取消"按钮 | `.f-modal .cancel` |
| 收藏列表项名称（旧） | `li h4` |
| 收藏列表项地址（旧） | `li .sub-title` |
| 下一页按钮 | `.iconfont.icon-chevronright` |
| 分页文本 | 快照中搜索 `X/Y页` 文本节点 |
| 登录弹窗二维码Tab | `playwright-cli snapshot` 后找"二维码登录"对应 ref |

---

## 注意事项

1. **`--persistent` 是关键**：每次操作都必须用 `playwright-cli open --persistent`，绝对不要用 `Start-Process chrome.exe + attach --cdp`，那种方式不会持久化 Cookie。
2. **二维码有效期**：约 2 分钟，过期需刷新页面重新获取。
3. **浏览器无头但可通过截图交互**：`--persistent` 模式下浏览器无界面，通过 `playwright-cli screenshot` 截图来查看当前状态，QR 码也通过截图展示给用户扫描。
4. **CSV 编码**：保存后务必转换为 UTF-8 BOM，否则 Excel 打开乱码。
5. **收藏条数**：每页约 100 条，多页需逐页提取。
6. **删除必须逐条确认**：每次点击 `.favdel` 后都会弹出 `.f-modal` 确认框，必须点 `.ok` 才真正删除。不能同时触发多个删除——会导致多个弹窗叠加，所有点击失效。
7. **删除后重新扫描 DOM**：每删一条后列表 DOM 会更新，必须重新获取 `li.favitem` 列表，不能复用删除前的元素引用。

---

## 示例：一键完整流程

```bash
# 1. 打开（持久化）
playwright-cli open https://www.amap.com/faves --persistent

# 2. 截图检查登录状态
playwright-cli screenshot --filename=amap-check.png

# 3. 如已登录，直接提取第1页
playwright-cli eval "[...document.querySelectorAll('li h4, li .sub-title')].map(el=>el.innerText.trim()).filter(t=>t).join('\n')"

# 4. 翻第2页
playwright-cli click ".iconfont.icon-chevronright"

# 5. 提取第2页
playwright-cli eval "[...document.querySelectorAll('li h4, li .sub-title')].map(el=>el.innerText.trim()).filter(t=>t).join('\n')"

# 6. 整理数据后用 Write 工具保存 CSV，再用 PowerShell 转 UTF-8 BOM
```
