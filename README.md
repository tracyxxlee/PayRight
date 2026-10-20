# 🛒 別多付 - 購物金額統計 App

一個手機網頁應用程式，讓您可以拍攝賣場電子標籤，透過 OCR 辨識商品品名和售價，自動統計購物金額，並支援各種特價活動計算。

## ✨ 功能特色

### 📷 拍照與 OCR 辨識
- 使用手機相機拍攝電子標籤
- 使用 Tesseract.js 進行本地 OCR 辨識（支援繁體中文）
- 自動提取商品名稱和價格
- 辨識後可手動確認或修正

### 🛍️ 商品管理
- 每筆商品以流水號辨識，品名可以重複
- 支援編輯商品（品名、價格、數量、特價）
- 支援刪除單個商品或清空購物清單
- 照片暫存功能（點擊可放大查看）

### 💰 特價活動支援
- **買一送一**：Math.ceil(數量 / 2) × 單價
- **買二送一**：Math.ceil(數量 / 3) × 2 × 單價
- **第二件半價**：配對計算（第二件為原價的 50%）
- **自訂小計**：適用於非內建規則（如買三送一）

### 📱 手機優先設計
- 響應式佈局（最大寬度 600px）
- 大按鈕設計（48-56px 高度）
- 流暢動畫效果
- Toast 通知系統
- 觸控操作優化

## 🚀 快速開始

### 安裝

先安裝依賴並複製離線 OCR 檔，再用本地伺服器開啟。要在 Android 上安裝成 App，見下方「Android App（Capacitor）」。

```bash
npm install
npm run copy:web
npm run serve
```

瀏覽器開啟 `http://127.0.0.1:8080`。請用這個指令，不要用 `python -m http.server`：Windows 上的 Python 常不送 JavaScript 的 Content-Type，OCR 的 Worker 會因此載入失敗。

### 使用方法

1. **開啟應用**
   - 執行 `npm run serve` 後，在瀏覽器開啟 `http://127.0.0.1:8080`

2. **拍照掃描商品**
   - 點擊「📷 拍照掃描商品」按鈕
   - 拍攝賣場電子標籤
   - 等待 OCR 辨識（約 5-10 秒）

3. **確認商品資訊**
   - 檢查辨識出的品名和價格
   - 手動修正（如需要）
   - 選擇數量和特價類型
   - 點擊「確認加入」

4. **管理購物清單**
   - 查看購物清單和總金額
   - 點擊「✏️ 編輯」修改商品
   - 點擊「🗑️ 刪除」移除商品
   - 點擊「清空清單」清除所有商品

5. **編輯商品**
   - 修改品名、價格、數量
   - 變更特價類型
   - 自訂小計（適用非內建規則）

## 📁 專案結構

```
mobileShoppingAPP/
├── index.html              # 主頁面
├── styles.css              # 樣式表
├── app.js                  # 主應用邏輯
├── ocr-service.js          # OCR 辨識服務
├── product-manager.js      # 商品管理模組
├── price-calculator.js     # 特價計算模組
├── capacitor.config.json   # Capacitor 設定
├── package.json            # npm 腳本與 Capacitor 依賴
├── scripts/copy-web.mjs    # 將網頁檔複製到 www/
├── android/                # Android 原生專案（cap add 後產生）
├── docs/                   # 補充文件（目錄與版控見 project-layout.md）
└── README.md               # 說明文件
```

哪些目錄要進 Git、本機產物與 APK 路徑的完整說明見 [docs/project-layout.md](docs/project-layout.md)。

## Android App（Capacitor）

網頁仍是 HTML + JS。Capacitor 把 `www/` 包進 Android WebView，產生可安裝的 App。

前置環境：

- Node.js 20 以上
- JDK 17 或 21
- Android Studio（含 Android SDK）。第一次請用 Android Studio 開啟 `android/`，讓它下載 SDK 與 Gradle。

```bash
npm install
npm run cap:sync
npm run android:open
```

在 Android Studio 選實體手機或模擬器，按 Run。要產出可安裝的 APK，見下方「打包 Android APK」。

改完 HTML / JS / CSS 後再執行一次 `npm run cap:sync`，原生專案才會吃到新的網頁。

拍照使用頁面上的檔案輸入（`capture="environment"`），Android 會叫起相機。OCR 的 Tesseract.js、辨識核心與繁中語料（完整 `4.0.0` 模型）在 `npm run copy:web` 時複製到 `vendor/tesseract/`，辨識不需要網路。

## 打包 Android APK

以下指令在專案根目錄執行。Windows 請用 PowerShell 或命令提示字元；`gradlew.bat` 是 Android 專案內的 Gradle Wrapper，第一次建置會下載依賴，需要網路。

改過 HTML、JS 或 CSS 後，打包前都要先同步，否則 APK 裡仍是舊的網頁：

```bash
npm run cap:sync
```

### Debug APK（測試用，可直接安裝）

Debug 套件已用 Android 除錯憑證簽章，適合自己手機安裝測試。

```bash
npm install
npm run android:debug
```

等同於先同步網頁，再在 `android/` 執行 `gradlew.bat assembleDebug`。

產出路徑：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

手機開啟「允許安裝不明來源的應用程式」後，把這個檔案傳過去即可安裝。已接上 USB 並開啟偵錯時，也可用 adb：

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK（正式安裝，需要自己的簽章）

Release 建置預設沒有簽章設定，直接組出來的是未簽章套件，手機無法安裝。請自行建立金鑰庫（不要提交到 Git），再對齊並簽章。

1. 只做一次：建立金鑰庫。密碼與別名請自行保管，之後更新同一個 App 必須用同一把金鑰。

```bash
keytool -genkeypair -v -keystore release.keystore -alias shopping -keyalg RSA -keysize 2048 -validity 10000
```

2. 組出未簽章的 Release APK（指令結束後會回到專案根目錄）：

```bash
npm run cap:sync
cd android
gradlew.bat assembleRelease
cd ..
```

產出路徑：

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

3. 回到專案根目錄後，用 Android SDK Build-Tools 裡的 `zipalign` 與 `apksigner` 簽章。把 `34.0.0` 換成 `%ANDROID_HOME%\build-tools` 裡實際的版本。Windows 的 `ANDROID_HOME` 通常是 `%LOCALAPPDATA%\Android\Sdk`。

命令提示字元：

```bat
set BUILD_TOOLS=%ANDROID_HOME%\build-tools\34.0.0
%BUILD_TOOLS%\zipalign -v -p 4 android\app\build\outputs\apk\release\app-release-unsigned.apk app-release-aligned.apk
%BUILD_TOOLS%\apksigner sign --ks release.keystore --ks-key-alias shopping --out app-release.apk app-release-aligned.apk
%BUILD_TOOLS%\apksigner verify app-release.apk
```

PowerShell：

```powershell
$env:BUILD_TOOLS = "$env:ANDROID_HOME\build-tools\34.0.0"
& "$env:BUILD_TOOLS\zipalign" -v -p 4 android\app\build\outputs\apk\release\app-release-unsigned.apk app-release-aligned.apk
& "$env:BUILD_TOOLS\apksigner" sign --ks release.keystore --ks-key-alias shopping --out app-release.apk app-release-aligned.apk
& "$env:BUILD_TOOLS\apksigner" verify app-release.apk
```

簽好的檔案是專案根目錄的 `app-release.apk`。`release.keystore`、對齊後的中間檔與 `app-release.apk` 都不要提交。

也可以用 Android Studio：開啟 `android/` 後選 **Build → Generate Signed App Bundle or APK → APK**，選同一把金鑰庫完成簽章。

## 🎯 技術架構

### 技術棧
- **前端框架**：純 HTML5 + CSS3 + Vanilla JavaScript
- **OCR 引擎**：Tesseract.js 5.x（繁體中文，語料隨 App 打包）
- **圖片處理**：Canvas API（壓縮、預處理）

### 核心模組

#### OCRService
- 圖片預處理（灰階、對比度增強）
- OCR 辨識（繁體中文；App 啟動時預熱 Worker）
- 智慧解析商品資訊
- 辨識超過 2 秒視為失敗，改由使用者自行填寫商品資訊

#### ProductManager
- 商品 CRUD 操作
- 以流水號辨識每一筆，品名可以重複
- 讀取回傳複本，變更只能走新增、更新、刪除

#### PriceCalculator
- 特價計算引擎
- 支援 6 種特價類型
- 節省金額計算
- 自訂小計支援

## 🔧 開發指南

### 本地開發

```bash
npm run serve
```

在瀏覽器開啟 `http://127.0.0.1:8080`。

### Debug 模式

在瀏覽器 Console 中執行：

```javascript
// 查看購物清單（回傳的是複本）
console.table(productManager.getAllProducts());
```

### 清除資料

購物清單只存在這次開啟的記憶體裡。點擊「清空清單」，或在 Console 執行 `productManager.clearAll()`。

## 📝 資料結構

### 商品物件

```javascript
{
  id: "1",                              // 流水號字串，由 ProductManager 指定
  serial: 1,                            // 同一個流水號的數字
  name: "義大利1895巴羅洛紅酒 DOCG",   // 商品名稱
  price: 1099,                          // 單價（元）
  quantity: 2,                          // 數量
  promotion: "second_half",             // 特價類型
  customSubtotal: null,                 // 自訂小計（元）
  photo: "data:image/jpeg;base64,...",  // 照片（base64）
  timestamp: 1699999999000              // 時間戳記
}
```

### 特價類型

| 值 | 名稱 | 計算方式 |
|---|---|---|
| `none` | 無特價 | 數量 × 單價 |
| `buy_one_get_one` | 買一送一 | ⌈數量 / 2⌉ × 單價 |
| `buy_two_get_one` | 買二送一 | ⌈數量 / 3⌉ × 2 × 單價 |
| `second_half` | 第二件半價 | 配對計算（第二件為原價的 50%） |

## ⚠️ 已知限制

### OCR 辨識
- 辨識準確度受照片品質影響
- 建議在光線充足環境拍攝
- 辨識時間約 5-10 秒
- 辨識使用隨套件複製的本地語料，不需要網路

### 購物清單
- 清單只留在這次開啟的記憶體，重新整理或關掉 App 會清空
- 照片以壓縮後的 base64 留在該筆商品上，清單變長時會佔用記憶體

### 瀏覽器相容性
- 建議使用 Chrome、Safari、Firefox Mobile
- 需要支援 ES6+
- 需要支援 Canvas API
- 需要相機權限

## 🎨 自訂設計

### 修改顏色主題

編輯 `styles.css` 中的 CSS 變數：

```css
:root {
    --primary-color: #FF6B35;     /* 主色調 */
    --secondary-color: #4ECDC4;   /* 次要色調 */
    --success-color: #95E1D3;     /* 成功顏色 */
    --warning-color: #F38181;     /* 警告顏色 */
    --danger-color: #E74C3C;      /* 危險顏色 */
}
```

### 修改按鈕大小

```css
:root {
    --btn-height: 48px;           /* 一般按鈕高度 */
    --btn-height-lg: 56px;        /* 大按鈕高度 */
}
```

## 📞 問題回報

如遇到問題，請檢查瀏覽器 Console 的錯誤訊息，並確認：

1. ✅ 瀏覽器支援相機 API
2. ✅ 已授予相機權限
3. ✅ 已執行 `npm run copy:web`（本地 OCR 檔存在）
4. ✅ JavaScript 已啟用

## 📄 授權

本專案為個人學習專案，僅供參考使用。

---

**版本**：1.0.0  
**最後更新**：2026-10-07
