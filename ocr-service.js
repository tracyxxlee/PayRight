/**
 * OCR Service - 處理圖片辨識功能
 * 使用 Tesseract.js 進行本地 OCR 辨識
 */

class OCRService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        console.log('🔧 OCRService 初始化');
    }

    /**
     * 初始化 Tesseract Worker
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ OCR Worker 已初始化');
            return;
        }

        try {
            console.log('⏳ 正在初始化 Tesseract.js...');
            
            // 直接使用簡化版本，不傳入 logger（避免 DataCloneError）
            this.worker = await Tesseract.createWorker('chi_tra+eng');
            
            // Set parameters for better recognition
            await this.worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1',
            });

            this.isInitialized = true;
            console.log('✅ Tesseract.js 初始化完成');
            
        } catch (error) {
            console.error('❌ Tesseract.js 初始化失敗:', error);
            throw new Error('OCR 引擎初始化失敗');
        }
    }

    /**
     * 預處理圖片以提高辨識率
     * 使用較溫和的處理方式保留更多細節
     */
    preprocessImage(base64Image) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale up small images for better recognition
                let width = img.width;
                let height = img.height;
                const minWidth = 1200;
                
                if (width < minWidth) {
                    const scale = minWidth / width;
                    width = minWidth;
                    height = height * scale;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw original image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Convert to grayscale with gentle contrast enhancement
                for (let i = 0; i < data.length; i += 4) {
                    // Grayscale conversion
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    
                    // Gentle contrast enhancement (not binary threshold)
                    let enhanced = gray;
                    if (gray < 127) {
                        enhanced = gray * 0.7; // Darken dark pixels
                    } else {
                        enhanced = 127 + (gray - 127) * 1.3; // Brighten bright pixels
                        enhanced = Math.min(255, enhanced);
                    }
                    
                    data[i] = enhanced;     // R
                    data[i + 1] = enhanced; // G
                    data[i + 2] = enhanced; // B
                }
                
                // Put processed image back
                ctx.putImageData(imageData, 0, 0);
                
                const processed = canvas.toDataURL('image/jpeg', 0.95);
                console.log('🎨 圖片預處理完成 (尺寸:', width, 'x', height, ')');
                resolve(processed);
            };
            
            img.onerror = () => {
                console.warn('⚠️ 圖片預處理失敗，使用原圖');
                resolve(base64Image);
            };
            
            img.src = base64Image;
        });
    }

    /**
     * 執行 OCR 辨識
     */
    async recognize(base64Image, onProgress = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            console.log('🔍 開始 OCR 辨識...');
            
            // Try with preprocessed image first
            console.log('🎨 嘗試使用預處理圖片...');
            const preprocessed = await this.preprocessImage(base64Image);
            
            // Perform OCR
            const { data } = await this.worker.recognize(preprocessed);
            
            console.log('✅ OCR 辨識完成');
            console.log('📝 辨識文字:', data.text);
            console.log('📊 信心度:', (data.confidence || 0).toFixed(2) + '%');
            
            // If confidence is too low, try with original image
            if (data.confidence < 50) {
                console.log('⚠️ 信心度較低，嘗試使用原始圖片重新辨識...');
                try {
                    const { data: data2 } = await this.worker.recognize(base64Image);
                    if (data2.confidence > data.confidence) {
                        console.log('✅ 原始圖片辨識效果更好，使用新結果');
                        console.log('📝 辨識文字:', data2.text);
                        console.log('📊 信心度:', (data2.confidence || 0).toFixed(2) + '%');
                        return {
                            text: data2.text,
                            confidence: data2.confidence || 0,
                            words: data2.words || [],
                            lines: data2.lines || []
                        };
                    }
                } catch (err) {
                    console.warn('⚠️ 原始圖片辨識失敗，使用預處理結果');
                }
            }
            
            return {
                text: data.text,
                confidence: data.confidence || 0,
                words: data.words || [],
                lines: data.lines || []
            };
            
        } catch (error) {
            console.error('❌ OCR 辨識失敗:', error);
            console.error('錯誤詳情:', error.message);
            throw new Error('文字辨識失敗: ' + error.message);
        }
    }

    /**
     * 從辨識結果中解析商品資訊
     */
    parseProductInfo(ocrResult) {
        const text = ocrResult.text;
        console.log('🔎 解析商品資訊...');
        console.log('原始文字:', text);

        // Extract product name and price
        const parsed = {
            name: '',
            price: null,
            confidence: ocrResult.confidence
        };

        // Try to extract price (various formats)
        // More comprehensive patterns for price recognition
        const pricePatterns = [
            /(\d{2,5})\s*元/,                      // 1099元 (most common)
            /\$\s*(\d+(?:\.\d{1,2})?)/,           // $99 or $99.99
            /NT\$\s*(\d+(?:\.\d{1,2})?)/i,        // NT$99
            /售價?\s*[：:]\s*(\d+)/,               // 售價:99 or 價:99
            /^(\d{2,5})$/m,                        // Standalone large number on its own line
        ];

        for (const pattern of pricePatterns) {
            const match = text.match(pattern);
            if (match) {
                const price = parseFloat(match[1]);
                
                // Reasonable price range for grocery items
                if (!isNaN(price) && price >= 1 && price <= 99999) {
                    parsed.price = price;
                    console.log('💰 找到價格:', price, '元');
                    break;
                }
            }
        }

        // Extract product name
        // Split into lines and clean
        const lines = text.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);
        
        console.log('📋 所有文字行:', lines);
        
        // Filter out lines that only contain numbers, currency symbols, or price patterns
        const nameLines = lines.filter(line => {
            // Skip if line is too short
            if (line.length < 2) return false;
            
            // Skip if line is purely numeric
            if (/^\d+$/.test(line)) return false;
            
            // Skip if line only contains numbers and dots/spaces
            if (/^[\d\s\.]+$/.test(line)) return false;
            
            // Skip if line contains "元" and numbers (likely a price)
            if (/\d+\s*元/.test(line)) return false;
            
            // Skip common label words if they appear alone
            if (/^(促銷|價格|售價|特價)$/.test(line)) return false;
            
            return true;
        });

        console.log('📦 候選商品名稱行:', nameLines);

        if (nameLines.length > 0) {
            // Take the longest line as product name (usually has the most info)
            parsed.name = nameLines.reduce((longest, current) => 
                current.length > longest.length ? current : longest
            , nameLines[0]);
            
            console.log('📦 選擇商品名稱:', parsed.name);
        }

        // If no name found, try to find any line with Chinese characters
        if (!parsed.name) {
            const chineseLines = lines.filter(line => /[\u4e00-\u9fa5]/.test(line));
            if (chineseLines.length > 0) {
                parsed.name = chineseLines[0];
                console.log('📦 使用包含中文的第一行:', parsed.name);
            }
        }

        // Last resort: use first line
        if (!parsed.name && lines.length > 0) {
            parsed.name = lines[0];
            console.log('📦 使用第一行作為商品名稱:', parsed.name);
        }

        console.log('✅ 解析結果:', parsed);
        return parsed;
    }

    /**
     * 終止 Worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            console.log('🛑 OCR Worker 已終止');
        }
    }
}

// Create global OCR service instance
const ocrService = new OCRService();

console.log('✅ OCR Service 模組已載入');
