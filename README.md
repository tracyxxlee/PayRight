# 🛒 別多付 — 購物金額統計

把結帳前那一段心算，收成一趟可以邊走邊拍的清單。

**痛點：** 全聯常常發生賣場標價與實際結帳對不上。這個 side project 的目的是不再當冤大頭 — 走到櫃檯前就知道「這次實際要付多少」；金額不對，立刻能拿出價目牌照片當佐證。

## 設計主張

購物清單不是商品資料庫，是**這一次採購的暫存草稿**。每拍一張標籤、填好品名與售價，就多一筆可核對的金額；特價用規則算，總額跟著清單即時更新。人負責確認貨架上的事實，App 負責把數量和促銷換成小計。

## 怎麼用（30 秒上手）

1. 打開 App → 點「拍照商品標籤」  
2. 拍下價目／促銷標籤 → 填品名、單價、數量、特價 → 確認加入  
3. 邊逛邊加；總金額一路更新  
4. 到收銀台核對；有爭議就點開該筆照片

## 四個原則

**特價是公式，不是印象**  
提供台灣最常見的 買一送一、買二送一、第二件半價、X個Y元（例如 3 個 100 元）。對不上的檔期（例如買三送一）用自訂小計。規則一選，小計與總額自動重算。

**一筆貨架，一個流水號**  
同一品名可以出現多次 — 購買兩罐可能一個原價、一個半價。照片綁在該筆商品上，事後用照片核對，不必憑記憶改價。

**算完即走，資料不帶走**  
所有都在手機上完成。清單只活在這一次開啟裡：逛完、結完、關掉，草稿就結束。它服務的是結帳前的幾分鐘，而不是長期的消費紀錄。沒有帳號、不需網路，系統負擔也最小。

**爭議有憑據**  
標籤拍下來就是證據。金額和店方對不上時，不用乾等「支援收銀」再跑回貨架，照片拿出來就能溝通。

## 一句話

在貨架與收銀台之間，用一張照片和一條特價規則，把「貨架上看到的資訊」換成具體總金額。

**別多付 — 讓你不多付一塊錢。**

## 下載／取得 App

目前為個人 side project，**尚未上架 Google Play**。Android 可用 Debug APK 安裝測試：

1. 開啟本 repo 的 [Actions](https://github.com/tracyxxlee/PayRight/actions)  
2. 選最新成功的 **Build Android APK** workflow  
3. 下載 artifact（`payright-debug-apk-…`）內的 `app-debug.apk`  

手機需允許「安裝不明來源」。此為測試用 Debug 簽章，適合自用試用。

也可以自行從原始碼建置，見下方「打包 Android APK」。

---

## 開發者說明

以下為本機開發、專案結構與 Android 建置指引。

### 功能摘要（實作對照）

| 面向 | 說明 |
|------|------|
| 拍照新增 | 相機拍標籤後進入「編輯商品」，手動填品名、價格、數量與特價 |
| 清單管理 | 流水號辨識；品名可重複；點選編輯；左右滑刪除；清空清單 |
| 照片 | 壓縮後暫存在該筆商品；點擊可放大 |
| 特價 | 無特價、買一送一、買二送一、第二件半價、X個Y元、自訂小計 |
| 資料 | 僅存在本次開啟的記憶體，關閉或重新整理即清空 |

### 快速開始（瀏覽器）

```bash
npm install
npm run copy:web
npm run serve
```

瀏覽器開啟 `http://127.0.0.1:8080`。請用這個指令，不要用 `python -m http.server`：Windows 上的 Python 常不送 JavaScript 的 Content-Type，本地開發伺服器較穩妥。

### 專案結構

```
PayRight/
├── index.html              # 主頁面
├── styles.css              # 樣式表
├── app.js                  # 主應用邏輯
├── product-manager.js      # 商品管理模組
├── price-calculator.js     # 特價計算模組
├── capacitor.config.json   # Capacitor 設定
├── package.json            # npm 腳本與 Capacitor 依賴
├── scripts/copy-web.mjs    # 將網頁檔複製到 www/
├── android/                # Android 原生專案
├── docs/                   # 補充文件（目錄與版控見 project-layout.md）
└── README.md               # 說明文件
```

哪些目錄要進 Git、本機產物與 APK 路徑的完整說明見 [docs/project-layout.md](docs/project-layout.md)。

### Android App（Capacitor）

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

拍照：瀏覽器使用頁面上的檔案輸入（`capture="environment"`）；Android App 內則透過 Capacitor Camera 叫起系統相機。

狀態列／導覽列：Android App 永久顯示系統狀態列與底部導覽列（不進 immersive 全螢幕）。Status Bar 設為 `LIGHT`（深色圖示）與白底；`overlaysWebView: false`，並在 Android 15 以 `windowOptOutEdgeToEdgeEnforcement` 退出強制 edge-to-edge，避免內容壓在系統列底下。

### 打包 Android APK

以下指令在專案根目錄執行。Windows 請用 PowerShell 或命令提示字元；`gradlew.bat` 是 Android 專案內的 Gradle Wrapper，第一次建置會下載依賴，需要網路。

改過 HTML、JS 或 CSS 後，打包前都要先同步，否則 APK 裡仍是舊的網頁：

```bash
npm run cap:sync
```

#### Debug APK（測試用，可直接安裝）

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

CI：push / PR 到 `main` 時，[GitHub Actions](https://github.com/tracyxxlee/PayRight/actions) 會組出同一份 Debug APK 並上傳為 artifact。

#### Release APK（正式安裝，需要自己的簽章）

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

### 技術架構

- **前端**：純 HTML5 + CSS3 + Vanilla JavaScript  
- **圖片處理**：Canvas API（清單縮圖壓縮）  
- **原生橋接**：Capacitor（Android Camera、Status Bar）  

#### ProductManager

- 商品 CRUD；以流水號辨識每一筆，品名可以重複  
- 讀取回傳複本，變更只能走新增、更新、刪除  

#### PriceCalculator

- 特價計算引擎  
- 支援無特價、買一送一、買二送一、第二件半價、X個Y元、自訂小計  

### 開發指南

```bash
npm run serve
```

在瀏覽器開啟 `http://127.0.0.1:8080`。

Console 除錯：

```javascript
// 查看購物清單（回傳的是複本）
console.table(productManager.getAllProducts());
```

購物清單只存在這次開啟的記憶體裡。點擊「清空清單」，或在 Console 執行 `productManager.clearAll()`。

### 資料結構

#### 商品物件

```javascript
{
  id: "1",                              // 流水號字串，由 ProductManager 指定
  serial: 1,                            // 同一個流水號的數字
  name: "義大利1895巴羅洛紅酒",          // 商品名稱
  price: 1099,                          // 單價（元，正整數）
  quantity: 2,                          // 數量（正整數）
  promotion: "second_half",             // 特價類型
  bulkQuantity: null,                   // X個Y元：X（數量門檻）
  bulkPrice: null,                      // X個Y元：Y（組價）
  customSubtotal: null,                 // 自訂小計（元，正整數；僅 promotion 為 custom_subtotal）
  subtotal: 1649,                       // 儲存時算出的最終小計（元）；清單頁直接讀取
  photo: "data:image/jpeg;base64,...",  // 照片（base64）
  timestamp: 1699999999000              // 時間戳記
}
```

#### 特價類型

| 值 | 名稱 | 計算方式 |
|---|---|---|
| `none` | 無特價 | 數量 × 單價 |
| `buy_one_get_one` | 買一送一 | ⌈數量 / 2⌉ × 單價 |
| `buy_two_get_one` | 買二送一 | 每滿 3 件付 2 件，餘數照單價 |
| `second_half` | 第二件半價 | 配對計算（第二件為原價的 50%） |
| `bulk_discount` | X個Y元 | 完整組 × Y + 餘數 × 單價（數量須為 X 的倍數） |
| `custom_subtotal` | 自訂小計 | 直接使用 `customSubtotal` |

### 已知限制

- 清單只留在這次開啟的記憶體，重新整理或關掉 App 會清空  
- 照片以壓縮後的 base64 留在該筆商品上，清單變長時會佔用記憶體  
- 建議使用 Chrome、Safari、Firefox Mobile；需 ES6+、Canvas API、相機權限  

### 自訂設計

編輯 `styles.css` 中的 CSS 變數：

```css
:root {
    --primary-color: #FF6B35;     /* 主色調 */
    --secondary-color: #4ECDC4;   /* 次要色調 */
    --success-color: #95E1D3;     /* 成功顏色 */
    --warning-color: #F38181;     /* 警告顏色 */
    --danger-color: #E74C3C;      /* 危險顏色 */
    --btn-height: 48px;           /* 一般按鈕高度 */
    --btn-height-lg: 56px;        /* 大按鈕高度 */
}
```

### 問題回報

如遇到問題，請檢查瀏覽器 Console 的錯誤訊息，並確認：

1. 瀏覽器支援相機 API
2. 已授予相機權限
3. JavaScript 已啟用

### 授權

本專案為個人學習專案，僅供參考使用。

---

**版本**：1.0.0  
**最後更新**：2026-10-27
