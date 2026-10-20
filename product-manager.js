/**
 * Product Manager - 管理購物清單中的商品
 * 新增、更新、刪除都走這裡。讀取只回傳複本，呼叫端改不到內部資料。
 * 每筆商品用流水號辨識，品名可以重複。
 */

class ProductManager {
    constructor() {
        this.products = [];
        this.nextSerial = 1;
        console.log('📦 ProductManager 初始化');
    }

    cloneProduct(product) {
        return { ...product };
    }

    /**
     * 新增一筆商品。品名重複也是新的一筆，流水號由這裡指定。
     * @returns {{ product: Object }}
     */
    addProduct(product) {
        console.log('➕ 新增商品:', product.name);

        const serial = this.nextSerial;
        this.nextSerial += 1;

        const stored = {
            name: product.name,
            price: product.price,
            quantity: product.quantity,
            promotion: product.promotion,
            bulkQuantity: product.bulkQuantity,
            bulkPrice: product.bulkPrice,
            customSubtotal: product.customSubtotal,
            photo: product.photo,
            timestamp: Date.now(),
            serial,
            id: String(serial)
        };

        this.products.unshift(stored);
        console.log('✅ 新商品已加入最上方:', stored);
        return { product: this.cloneProduct(stored) };
    }

    /**
     * 更新商品資訊。流水號與 id 不能從外部改掉。
     * @returns {Object|null} 更新後的複本；找不到時為 null
     */
    updateProduct(productId, updates) {
        console.log('✏️ 更新商品:', productId, updates);

        const product = this.products.find(p => p.id === String(productId));

        if (!product) {
            console.error('❌ 找不到商品:', productId);
            return null;
        }

        const {
            id: _id,
            serial: _serial,
            ...safeUpdates
        } = updates || {};

        Object.assign(product, safeUpdates);
        product.timestamp = Date.now();

        console.log('✅ 商品已更新:', product);
        return this.cloneProduct(product);
    }

    /**
     * 刪除商品
     */
    deleteProduct(productId) {
        console.log('🗑️ 刪除商品:', productId);

        const index = this.products.findIndex(p => p.id === String(productId));

        if (index === -1) {
            console.error('❌ 找不到商品:', productId);
            return false;
        }

        const deletedProduct = this.products.splice(index, 1)[0];
        console.log('✅ 商品已刪除:', deletedProduct);
        return true;
    }

    /**
     * 清空所有商品。流水號繼續往下編，不重用已刪除的號碼。
     */
    clearAll() {
        console.log('🧹 清空所有商品');
        this.products = [];
    }

    /**
     * 取得所有商品的複本
     */
    getAllProducts() {
        return this.products.map(product => this.cloneProduct(product));
    }

    /**
     * 取得單一商品的複本
     */
    getProductById(productId) {
        const product = this.products.find(p => p.id === String(productId));
        return product ? this.cloneProduct(product) : undefined;
    }

    /**
     * 取得商品總數
     */
    getProductCount() {
        return this.products.length;
    }

    /**
     * 檢查購物清單是否為空
     */
    isEmpty() {
        return this.products.length === 0;
    }
}

const productManager = new ProductManager();

console.log('✅ Product Manager 模組已載入');
