/**
 * OCR Service - 處理圖片辨識功能
 * 使用 Tesseract.js 進行本地 OCR 辨識
 */

class OCRService {
    constructor() {
        this.worker = null;
        this.isInitialized = false;
        this.timeoutMs = 45000;
        this.generation = 0;
        this._triggerCancelRecognize = null;
        console.log('🔧 OCRService 初始化');
    }

    _createCancelledError() {
        const error = new Error('辨識已取消');
        error.code = 'OCR_CANCELLED';
        return error;
    }

    /**
     * 使用者取消進行中的辨識（終止 Worker 並 reject 目前的 recognize）
     */
    cancel() {
        if (this._triggerCancelRecognize) {
            this._triggerCancelRecognize();
            return;
        }
        this.discardWorker();
    }

    /**
     * 初始化 Tesseract Worker
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ OCR Worker 已初始化');
            return;
        }

        const generation = this.generation;

        try {
            console.log('⏳ 正在初始化 Tesseract.js（本地語料）...');

            if (typeof Tesseract === 'undefined') {
                throw new Error('找不到本地 OCR 引擎，請先執行 npm run copy:web');
            }

            const assetUrl = (relativePath) => new URL(relativePath, window.location.href).href;

            // 引擎、worker、繁中語料（4.0.0 完整模型）在 vendor/tesseract，不連 jsDelivr
            const worker = await Tesseract.createWorker('chi_tra', 1, {
                workerPath: assetUrl('vendor/tesseract/worker.min.js'),
                corePath: assetUrl('vendor/tesseract/core'),
                langPath: assetUrl('vendor/tesseract/lang'),
                workerBlobURL: false,
                gzip: true,
            });

            if (generation !== this.generation) {
                Promise.resolve(worker.terminate()).catch(() => {});
                throw new Error('辨識已取消');
            }

            this.worker = worker;

            // Set parameters for better recognition
            await this.worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1',
            });

            if (generation !== this.generation) {
                this.discardWorker();
                throw new Error('辨識已取消');
            }

            this.isInitialized = true;
            console.log('✅ Tesseract.js 初始化完成');

        } catch (error) {
            if (error && error.message === '辨識已取消') {
                throw error;
            }
            console.error('❌ Tesseract.js 初始化失敗:', error);
            throw new Error('OCR 引擎初始化失敗');
        }
    }

    /**
     * 逾時後放掉這次的 worker，避免下一張照片卡在同一個辨識上。
     */
    discardWorker() {
        const worker = this.worker;
        this.generation += 1;
        this.worker = null;
        this.isInitialized = false;
        if (worker) {
            Promise.resolve(worker.terminate()).catch((err) => {
                console.warn('停止辨識失敗', err);
            });
        }
    }

    /**
     * 執行 OCR 辨識。超過 timeoutMs 視為失敗。
     */
    async recognize(base64Image) {
        const job = this.recognizeImage(base64Image);
        job.catch(() => {});

        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error('辨識失敗');
                error.code = 'OCR_TIMEOUT';
                reject(error);
            }, this.timeoutMs);
        });

        const cancel = new Promise((_, reject) => {
            this._triggerCancelRecognize = () => {
                this.discardWorker();
                reject(this._createCancelledError());
            };
        });

        try {
            return await Promise.race([job, timeout, cancel]);
        } catch (error) {
            if (error && error.code === 'OCR_TIMEOUT') {
                console.warn(`辨識超過 ${this.timeoutMs} 毫秒`);
                this.discardWorker();
            }
            if (error && error.code === 'OCR_CANCELLED') {
                console.log('使用者取消 OCR 辨識');
            }
            throw error;
        } finally {
            clearTimeout(timer);
            this._triggerCancelRecognize = null;
        }
    }

    async recognizeImage(base64Image) {
        const jobGeneration = this.generation;

        const assertNotCancelled = () => {
            if (jobGeneration !== this.generation) {
                throw this._createCancelledError();
            }
        };

        if (!this.isInitialized) {
            try {
                await this.initialize();
            } catch (error) {
                if (error && error.message === '辨識已取消') {
                    throw this._createCancelledError();
                }
                throw error;
            }
        }
        assertNotCancelled();

        try {
            console.log('🔍 開始 OCR 辨識（原圖，單次）...');

            const { data } = await this.worker.recognize(base64Image);
            assertNotCancelled();

            const confidence = this.computeRecognitionConfidence(data);

            console.log('✅ OCR 辨識完成');
            console.log('📝 辨識文字:', data.text);
            console.log('📊 信心度:', confidence.toFixed(2) + '%');

            return {
                text: data.text,
                confidence
            };

        } catch (error) {
            if (error && error.code === 'OCR_CANCELLED') {
                throw error;
            }
            if (jobGeneration !== this.generation) {
                throw this._createCancelledError();
            }
            console.error('❌ OCR 辨識失敗:', error);
            console.error('錯誤詳情:', error.message);
            throw new Error('文字辨識失敗: ' + error.message);
        }
    }

    /**
     * 依實際辨識到的字詞計算信心度。Tesseract 的 data.confidence 在無文字時仍可能偏高，不可直接採用。
     */
    computeRecognitionConfidence(data) {
        const text = (data.text || '').trim();
        if (!text) {
            return 0;
        }

        const words = Array.isArray(data.words) ? data.words : [];
        const scored = words.filter((w) => w.text && String(w.text).trim());
        if (scored.length > 0) {
            const total = scored.reduce((sum, w) => sum + (Number(w.confidence) || 0), 0);
            return total / scored.length;
        }

        const page = Number(data.confidence);
        if (Number.isFinite(page) && page >= 0) {
            return page;
        }
        return 0;
    }

    /**
     * 從辨識結果中解析商品資訊
     */
    parseProductInfo(ocrResult) {
        const text = ocrResult.text;
        console.log('🔎 解析商品資訊...');
        console.log('原始文字:', text);

        const textTrimmed = (text || '').trim();

        // Extract product name and price
        const parsed = {
            name: '',
            price: null,
            confidence: textTrimmed ? (ocrResult.confidence ?? 0) : 0
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
}

// Create global OCR service instance
const ocrService = new OCRService();

console.log('✅ OCR Service 模組已載入');
