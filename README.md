# 拾火創意 PIKHUO 官網

這是一個可直接部署至 GitHub Pages 的靜態網站。HTML、CSS、文字設定、粒子程式與 Google 試算表串接程式皆已分開。

## 先預覽網站

請不要直接雙擊 `index.html`，因為瀏覽器會阻擋模組與 Logo 圖檔讀取。

在網站資料夾開啟終端機後執行：

```bash
python -m http.server 8080
```

再開啟：

```text
http://localhost:8080
```

## 修改文字

開啟 `js/content.js`。首頁標題、流程、服務、合作對象、合作方式、聯絡資訊都集中在這個檔案。

只修改引號內的文字，保留逗號、引號、中括號與大括號。

## 更換方形品牌符號

目前粒子使用：

```text
assets/pikhuo-mark.png
```

如果日後更換檔案，請維持透明背景 PNG，並使用相同檔名。程式會讀取圖片透明度，自動生成粒子座標，不會重新繪製 Logo。

## 粒子視覺邏輯

- Logo 使用原始圖片透明度取樣，不改變比例或輪廓。
- 流程依序轉換為引力場、DNA 雙螺旋、三葉結、墨比烏斯環與四股服務流。
- 六個畫面共用同一批粒子，因此捲動時是連續變形，不會突然換成另一套動畫。
- 主體圖形之外另有低亮度的前、中、後景環境粒子；前景柔焦光點只保留少量。
- 粒子在形狀完成後仍會沿路徑緩慢流動；捲動負責形狀之間的轉換。
- 粒子可以穿過文字後方，文字以沒有明顯邊界的深黑紫柔霧維持閱讀。
- 滑鼠移到服務項目時，對應的粒子流會稍微變亮。
- 手機版會降低粒子數量、關閉滑鼠互動，並提高文字後方柔霧濃度。

## 串接 Google 試算表

1. 開啟準備接收網站合作需求的 Google 試算表。
2. 點選「擴充功能 → Apps Script」。
3. 刪除原本的範例程式。
4. 複製 `google-apps-script/Code.gs` 全部內容並貼上。
5. 按右上角「部署 → 新增部署作業」。
6. 類型選擇「網頁應用程式」。
7. 執行身分選擇「我」。
8. 存取權限選擇允許網站訪客使用的公開選項。
9. 完成授權後，複製結尾為 `/exec` 的網址。
10. 開啟 `js/content.js`，把網址貼到 `formEndpoint`：

```js
formEndpoint: "https://script.google.com/macros/s/你的部署編號/exec"
```

11. 重新上傳網站並實際送出一筆測試資料。

Apps Script 會自動建立「合作需求」工作表與欄位。網站只有在收到後端成功回應後，才會顯示成功訊息。

## 部署 GitHub Pages

把這個資料夾中的全部內容上傳到 GitHub repository 的發布分支。GitHub Pages 的 Source 若使用一般靜態檔案，選擇 `Deploy from a branch`，發布資料夾選擇 repository 根目錄。

網站必須保留以下相對路徑：

```text
index.html
css/style.css
js/content.js
js/main.js
js/particles.js
assets/pikhuo-mark.png
```

## 無動畫與備援

- 使用者開啟「減少動態效果」時，粒子會降低移動與互動。
- 不支援 WebGL 2 或載入失敗時，會改顯示靜態品牌符號。
- 文字內容保留在 HTML，即使粒子程式失敗仍可閱讀。
- 表單尚未填入 Apps Script 網址時，不會顯示假成功。

## 主要檔案

```text
index.html                       網站結構與預設備援文字
css/style.css                    全站視覺、排版與手機版
js/content.js                    可直接修改的文案與聯絡資訊
js/particles.js                  WebGL 粒子、Logo 取樣與形態轉換
js/main.js                       導覽、捲動、表單與一般互動
google-apps-script/Code.gs       Google 試算表接收程式
```

## 2026-10-09 粒子重製

- 桌面：16,000 主體粒子、3,000 環境微塵、7,500 流場粒子、15 個前景光點。
- 手機：4,000 主體粒子、1,200 微塵、2,200 流場粒子、5 個前景光點；DPR 上限 1.25。
- Logo 分成結構 55%、輪廓 25%、高光 7%、游離 13%，依原始透明圖片取樣。
- 使用透視攝影機、Z 軸位置、HDR 高光、EffectComposer／UnrealBloomPass／OutputPass。
- 桌面 Bloom 閾值 1.05，只讓稀疏高光產生光暈；手機與減少動態效果模式關閉 Bloom。
- 前景使用世界座標的透明面片，著色器生成柔焦與緩慢呼吸，避免硬體點精靈尺寸限制。
- 霧光由 GPU 噪聲著色器生成；不使用全畫面景深後製，以保留文字與 Logo 可讀性。
- Three.js 0.180.0 與必要後製模組已附於 js/vendor/three，附 MIT 授權。部署時不需 npm 或 CDN。
- 文字仍修改 js/content.js；視覺主體在 js/particles.js；霧光、流場與前景在 js/atmosphere.js。
- 上傳全部檔案到 GitHub Pages，包含 js/vendor，勿只覆蓋 particles.js。

本次保留上傳版本的單頁架構。原檔的 formEndpoint 為空，表單尚未串接；聯絡資訊沿用原檔，發布前請核對。

字型使用系統中文字型，不再依賴 Google Fonts。瀏覽器驗證：1440×900、390×844 與減少動態效果模式；三種模式渲染成功，無水平溢出、無 JavaScript 或 Shader 錯誤。
