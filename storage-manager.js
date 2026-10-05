/**
 * Storage Manager - 管理 localStorage 的資料儲存
 * 處理商品清單和照片的持久化儲存
 */

class StorageManager {
    constructor() {
        // localStorage keys
        this.KEYS = {
            PRODUCTS: 'shopping_app_products',
            PHOTOS: 'shopping_app_photos',
            LAST_UPDATE: 'shopping_app_last_update'
        };

        console.log('💾 StorageManager 初始化');
        this.checkStorageAvailable();
    }

    /**
     * 檢查 localStorage 是否可用
     */
    checkStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            console.log('✅ localStorage 可用');
            return true;
        } catch (e) {
            console.error('❌ localStorage 不可用:', e);
            return false;
        }
    }

    /**
     * 儲存購物清單
     */
    saveProducts(products) {
        try {
            const data = JSON.stringify(products);
            localStorage.setItem(this.KEYS.PRODUCTS, data);
            localStorage.setItem(this.KEYS.LAST_UPDATE, Date.now().toString());
            
            console.log('💾 購物清單已儲存:', products.length, '項商品');
            console.log('📊 資料大小:', (data.length / 1024).toFixed(2), 'KB');
            return true;
        } catch (error) {
            console.error('❌ 儲存購物清單失敗:', error);
            
            if (error.name === 'QuotaExceededError') {
                console.error('💥 localStorage 容量不足');
                alert('儲存空間不足，請清理部分資料');
            }
            
            return false;
        }
    }

    /**
     * 讀取購物清單
     */
    loadProducts() {
        try {
            const data = localStorage.getItem(this.KEYS.PRODUCTS);
            
            if (!data) {
                console.log('📭 沒有儲存的購物清單');
                return [];
            }

            const products = JSON.parse(data);
            console.log('📂 讀取購物清單:', products.length, '項商品');
            return products;
        } catch (error) {
            console.error('❌ 讀取購物清單失敗:', error);
            return [];
        }
    }

    /**
     * 儲存照片（使用獨立的照片儲存結構）
     */
    savePhoto(productId, base64Image) {
        try {
            const photos = this.loadPhotos();
            photos[productId] = base64Image;
            
            const data = JSON.stringify(photos);
            localStorage.setItem(this.KEYS.PHOTOS, data);
            
            console.log('📸 照片已儲存:', productId);
            console.log('📊 照片儲存大小:', (data.length / 1024).toFixed(2), 'KB');
            return true;
        } catch (error) {
            console.error('❌ 儲存照片失敗:', error);
            
            if (error.name === 'QuotaExceededError') {
                console.warn('💥 localStorage 容量不足，無法儲存照片');
                // 照片儲存失敗不影響商品資料
                return false;
            }
            
            return false;
        }
    }

    /**
     * 讀取照片
     */
    loadPhoto(productId) {
        try {
            const photos = this.loadPhotos();
            return photos[productId] || null;
        } catch (error) {
            console.error('❌ 讀取照片失敗:', error);
            return null;
        }
    }

    /**
     * 讀取所有照片
     */
    loadPhotos() {
        try {
            const data = localStorage.getItem(this.KEYS.PHOTOS);
            
            if (!data) {
                return {};
            }

            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 讀取照片資料失敗:', error);
            return {};
        }
    }

    /**
     * 刪除照片
     */
    deletePhoto(productId) {
        try {
            const photos = this.loadPhotos();
            
            if (photos[productId]) {
                delete photos[productId];
                localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(photos));
                console.log('🗑️ 照片已刪除:', productId);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ 刪除照片失敗:', error);
            return false;
        }
    }

    /**
     * 清空所有資料
     */
    clearAll() {
        try {
            localStorage.removeItem(this.KEYS.PRODUCTS);
            localStorage.removeItem(this.KEYS.PHOTOS);
            localStorage.removeItem(this.KEYS.LAST_UPDATE);
            
            console.log('🗑️ 所有資料已清空');
            return true;
        } catch (error) {
            console.error('❌ 清空資料失敗:', error);
            return false;
        }
    }

    /**
     * 取得最後更新時間
     */
    getLastUpdateTime() {
        try {
            const timestamp = localStorage.getItem(this.KEYS.LAST_UPDATE);
            return timestamp ? parseInt(timestamp) : null;
        } catch (error) {
            console.error('❌ 讀取更新時間失敗:', error);
            return null;
        }
    }

    /**
     * 取得儲存空間使用情況
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            let itemCount = 0;

            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const itemSize = localStorage.getItem(key).length;
                    totalSize += itemSize;
                    itemCount++;
                }
            }

            // localStorage 通常有 5-10MB 限制
            const usedKB = (totalSize / 1024).toFixed(2);
            const estimatedLimit = 5 * 1024; // 假設 5MB
            const usedPercentage = ((totalSize / 1024) / estimatedLimit * 100).toFixed(1);

            return {
                totalSize: totalSize,
                usedKB: usedKB,
                itemCount: itemCount,
                usedPercentage: usedPercentage
            };
        } catch (error) {
            console.error('❌ 取得儲存資訊失敗:', error);
            return null;
        }
    }

    /**
     * 匯出所有資料（用於備份）
     */
    exportAllData() {
        try {
            const products = this.loadProducts();
            const photos = this.loadPhotos();
            const lastUpdate = this.getLastUpdateTime();

            const exportData = {
                version: '1.0',
                timestamp: Date.now(),
                lastUpdate: lastUpdate,
                products: products,
                photos: photos
            };

            console.log('📦 匯出資料完成');
            return exportData;
        } catch (error) {
            console.error('❌ 匯出資料失敗:', error);
            return null;
        }
    }

    /**
     * 匯入資料（用於還原備份）
     */
    importAllData(importData) {
        try {
            if (!importData || !importData.products) {
                console.error('❌ 無效的匯入資料');
                return false;
            }

            // 儲存商品
            this.saveProducts(importData.products);

            // 儲存照片（如果有）
            if (importData.photos) {
                localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(importData.photos));
            }

            console.log('✅ 匯入資料完成');
            return true;
        } catch (error) {
            console.error('❌ 匯入資料失敗:', error);
            return false;
        }
    }

    /**
     * 壓縮照片資料（移除未使用的照片）
     */
    compressPhotos(currentProductIds) {
        try {
            const photos = this.loadPhotos();
            const compressedPhotos = {};
            let removedCount = 0;

            // 只保留當前商品的照片
            for (const productId of currentProductIds) {
                if (photos[productId]) {
                    compressedPhotos[productId] = photos[productId];
                }
            }

            removedCount = Object.keys(photos).length - Object.keys(compressedPhotos).length;

            if (removedCount > 0) {
                localStorage.setItem(this.KEYS.PHOTOS, JSON.stringify(compressedPhotos));
                console.log(`🗜️ 照片壓縮完成，移除 ${removedCount} 張未使用的照片`);
            }

            return removedCount;
        } catch (error) {
            console.error('❌ 壓縮照片失敗:', error);
            return 0;
        }
    }

    /**
     * Debug: 顯示儲存資訊
     */
    debug() {
        console.log('🔍 Storage Debug:');
        
        const info = this.getStorageInfo();
        if (info) {
            console.log(`總大小: ${info.usedKB} KB`);
            console.log(`項目數: ${info.itemCount}`);
            console.log(`使用率: ${info.usedPercentage}%`);
        }

        const products = this.loadProducts();
        console.log(`商品數: ${products.length}`);

        const photos = this.loadPhotos();
        console.log(`照片數: ${Object.keys(photos).length}`);

        const lastUpdate = this.getLastUpdateTime();
        if (lastUpdate) {
            console.log(`最後更新: ${new Date(lastUpdate).toLocaleString()}`);
        }
    }
}

// Create global storage manager instance
const storageManager = new StorageManager();

console.log('✅ StorageManager 模組已載入');
