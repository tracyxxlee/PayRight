/**
 * Product Manager - 管理購物清單中的商品
 * 負責新增、更新、刪除和合併商品
 */

class ProductManager {
    constructor() {
        this.products = [];
        console.log('📦 ProductManager 初始化');
    }

    /**
     * 新增商品到清單
     * 如果商品名稱已存在，則合併數量
     * @returns {Object} { product, isMerged, addedQuantity, totalQuantity } - 返回商品和合併資訊
     */
    addProduct(product) {
        console.log('➕ 嘗試新增商品:', product.name);
        
        // Check if product with same name exists
        const existingProduct = this.products.find(p => p.name === product.name);
        
        if (existingProduct) {
            // Merge quantities
            const oldQuantity = existingProduct.quantity;
            existingProduct.quantity += product.quantity;
            existingProduct.timestamp = Date.now(); // Update timestamp
            console.log('🔄 商品已存在，合併數量:', existingProduct);
            return { 
                product: existingProduct, 
                isMerged: true, 
                addedQuantity: product.quantity, 
                totalQuantity: existingProduct.quantity 
            };
        } else {
            // Add new product
            this.products.push(product);
            console.log('✅ 新商品已加入:', product);
            return { 
                product: product, 
                isMerged: false 
            };
        }
    }

    /**
     * 更新商品資訊
     */
    updateProduct(productId, updates) {
        console.log('✏️ 更新商品:', productId, updates);
        
        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            console.error('❌ 找不到商品:', productId);
            return null;
        }
        
        // Apply updates
        Object.assign(product, updates);
        product.timestamp = Date.now(); // Update timestamp
        
        console.log('✅ 商品已更新:', product);
        return product;
    }

    /**
     * 刪除商品
     */
    deleteProduct(productId) {
        console.log('🗑️ 刪除商品:', productId);
        
        const index = this.products.findIndex(p => p.id === productId);
        
        if (index === -1) {
            console.error('❌ 找不到商品:', productId);
            return false;
        }
        
        const deletedProduct = this.products.splice(index, 1)[0];
        console.log('✅ 商品已刪除:', deletedProduct);
        return true;
    }

    /**
     * 清空所有商品
     */
    clearAll() {
        console.log('🧹 清空所有商品');
        this.products = [];
    }

    /**
     * 取得所有商品
     */
    getAllProducts() {
        return this.products;
    }

    /**
     * 取得單一商品
     */
    getProduct(productId) {
        return this.products.find(p => p.id === productId);
    }

    /**
     * 取得單一商品（別名方法）
     */
    getProductById(productId) {
        return this.getProduct(productId);
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

    /**
     * 從 localStorage 匯入商品
     */
    importProducts(productsData) {
        console.log('📥 匯入商品:', productsData.length, '項');
        this.products = productsData;
    }

    /**
     * 匯出商品資料（用於儲存）
     */
    exportProducts() {
        return this.products;
    }
}

// Create global product manager instance
const productManager = new ProductManager();

console.log('✅ Product Manager 模組已載入');
