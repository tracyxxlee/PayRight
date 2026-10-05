/**
 * Price Calculator - 計算商品特價金額
 * 支援各種特價活動規則
 */

class PriceCalculator {
    constructor() {
        // 定義特價類型
        this.PROMOTION_TYPES = {
            NONE: 'none',
            BUY_ONE_GET_ONE: 'buy_one_get_one',
            BUY_TWO_GET_ONE: 'buy_two_get_one',
            SECOND_HALF: 'second_half',
            BULK_DISCOUNT: 'bulk_discount'
        };

        // 特價類型名稱對照
        this.PROMOTION_NAMES = {
            'none': '無特價',
            'buy_one_get_one': '買一送一',
            'buy_two_get_one': '買二送一',
            'second_half': '第二件半價',
            'bulk_discount': 'X個Y元'
        };

        console.log('💰 PriceCalculator 初始化');
    }

    /**
     * 計算商品小計
     * @param {Object} product - 商品物件
     * @returns {number} 小計金額
     */
    calculateSubtotal(product) {
        // 如果有自訂小計，直接使用
        if (product.customSubtotal !== null && product.customSubtotal !== undefined) {
            console.log(`💵 使用自訂小計: ${product.customSubtotal} 元`);
            return product.customSubtotal;
        }

        const { price, quantity, promotion } = product;

        // 根據特價類型計算
        let subtotal = 0;
        
        switch (promotion) {
            case this.PROMOTION_TYPES.NONE:
                subtotal = this.calculateNormal(price, quantity);
                break;
            case this.PROMOTION_TYPES.BUY_ONE_GET_ONE:
                subtotal = this.calculateBuyOneGetOne(price, quantity);
                break;
            case this.PROMOTION_TYPES.BUY_TWO_GET_ONE:
                subtotal = this.calculateBuyTwoGetOne(price, quantity);
                break;
            case this.PROMOTION_TYPES.SECOND_HALF:
                subtotal = this.calculateSecondHalf(price, quantity);
                break;
            case this.PROMOTION_TYPES.BULK_DISCOUNT:
                subtotal = this.calculateBulkDiscount(product);
                break;
            default:
                console.warn('⚠️ 未知的特價類型:', promotion);
                subtotal = this.calculateNormal(price, quantity);
        }

        console.log(`💰 ${product.name} 小計: ${subtotal} 元 (${this.PROMOTION_NAMES[promotion]})`);
        return Math.round(subtotal); // 四捨五入到整數
    }

    /**
     * 無特價：數量 × 單價
     */
    calculateNormal(price, quantity) {
        return price * quantity;
    }

    /**
     * 買一送一：Math.ceil(數量 / 2) × 單價
     * 範例：
     * - 1件 → 付1件 = 1 × 價格
     * - 2件 → 付1件 = 1 × 價格
     * - 3件 → 付2件 = 2 × 價格
     * - 4件 → 付2件 = 2 × 價格
     */
    calculateBuyOneGetOne(price, quantity) {
        const payFor = Math.ceil(quantity / 2);
        return price * payFor;
    }

    /**
     * 買二送一：Math.ceil(數量 / 3) × 2 × 單價
     * 範例：
     * - 1件 → 付1件 = 1 × 價格
     * - 2件 → 付2件 = 2 × 價格
     * - 3件 → 付2件 = 2 × 價格
     * - 4件 → 付3件 = 3 × 價格
     * - 5件 → 付4件 = 4 × 價格
     * - 6件 → 付4件 = 4 × 價格
     */
    calculateBuyTwoGetOne(price, quantity) {
        const groups = Math.ceil(quantity / 3);
        const payFor = Math.min(groups * 2, quantity); // 不會超過實際數量
        return price * payFor;
    }

    /**
     * 第二件半價（0.5折）
     * 範例：
     * - 1件 → 1 × 價格
     * - 2件 → 1 × 價格 + 0.5 × 價格 = 1.5 × 價格
     * - 3件 → 1 × 價格 + 0.5 × 價格 + 1 × 價格 = 2.5 × 價格
     * - 4件 → 2組 = 3 × 價格
     */
    calculateSecondHalf(price, quantity) {
        return this.calculateSecondDiscount(price, quantity, 0.5);
    }

    /**
     * 第二件折扣（通用）
     * @param {number} price - 單價
     * @param {number} quantity - 數量
     * @param {number} discount - 第二件折扣（0.5 = 半價）
     */
    calculateSecondDiscount(price, quantity, discount) {
        const pairs = Math.floor(quantity / 2); // 完整的配對數
        const remaining = quantity % 2; // 剩餘的單件
        
        // 每組 = 1件原價 + 1件折扣價
        const pairPrice = price * (1 + discount);
        const total = pairs * pairPrice + remaining * price;
        
        return total;
    }

    /**
     * 計算X個Y元優惠
     * @param {Object} product - 商品物件，包含 bulkQuantity, bulkPrice, quantity
     * @returns {number} 計算後的金額
     */
    calculateBulkDiscount(product) {
        const { quantity, bulkQuantity, bulkPrice, price } = product;
        
        if (!bulkQuantity || !bulkPrice || bulkQuantity <= 0 || bulkPrice <= 0) {
            console.warn('⚠️ 無效的X個Y元設定，使用原價計算');
            return this.calculateNormal(price, quantity);
        }

        // 計算完整的X個Y元組數
        const fullGroups = Math.floor(quantity / bulkQuantity);
        // 剩餘的單件數
        const remaining = quantity % bulkQuantity;
        
        // 完整組的金額 + 剩餘單件的原價
        const total = fullGroups * bulkPrice + remaining * price;
        
        console.log(`💰 X個Y元計算: ${quantity}件 = ${fullGroups}組×${bulkPrice}元 + ${remaining}件×${price}元 = ${total}元`);
        
        return total;
    }

    /**
     * 計算購物清單總金額
     * @param {Array} products - 商品陣列
     * @returns {number} 總金額
     */
    calculateTotal(products) {
        if (!products || products.length === 0) {
            return 0;
        }

        const total = products.reduce((sum, product) => {
            return sum + this.calculateSubtotal(product);
        }, 0);

        console.log(`🧮 購物清單總金額: ${total} 元`);
        return Math.round(total);
    }

    /**
     * 取得特價類型名稱
     */
    getPromotionName(promotionType) {
        return this.PROMOTION_NAMES[promotionType] || '未知';
    }

    /**
     * 取得所有特價類型
     */
    getAllPromotionTypes() {
        return Object.keys(this.PROMOTION_NAMES).map(key => ({
            value: key,
            label: this.PROMOTION_NAMES[key]
        }));
    }

    /**
     * 計算節省金額
     * @param {Object} product - 商品物件
     * @returns {number} 節省的金額
     */
    calculateSavings(product) {
        if (product.promotion === this.PROMOTION_TYPES.NONE) {
            return 0;
        }

        const normalPrice = this.calculateNormal(product.price, product.quantity);
        const discountPrice = this.calculateSubtotal(product);
        const savings = normalPrice - discountPrice;

        return Math.round(Math.max(0, savings));
    }

    /**
     * 取得商品價格資訊（詳細）
     * @param {Object} product - 商品物件
     * @returns {Object} 價格資訊
     */
    getPriceInfo(product) {
        const normalPrice = this.calculateNormal(product.price, product.quantity);
        const subtotal = this.calculateSubtotal(product);
        const savings = this.calculateSavings(product);
        const hasDiscount = product.promotion !== this.PROMOTION_TYPES.NONE || product.customSubtotal !== null;

        return {
            unitPrice: product.price,
            quantity: product.quantity,
            normalPrice: normalPrice,
            subtotal: subtotal,
            savings: savings,
            hasDiscount: hasDiscount,
            discountRate: hasDiscount && normalPrice > 0 ? ((1 - subtotal / normalPrice) * 100).toFixed(1) : 0,
            promotionName: this.getPromotionName(product.promotion)
        };
    }

    /**
     * Debug: 測試所有特價計算
     */
    debugTest() {
        console.log('🧪 測試特價計算功能');
        
        const testCases = [
            { name: '無特價', price: 100, quantity: 3, promotion: 'none' },
            { name: '買一送一', price: 100, quantity: 4, promotion: 'buy_one_get_one' },
            { name: '買二送一', price: 90, quantity: 6, promotion: 'buy_two_get_one' },
            { name: '第二件半價', price: 100, quantity: 5, promotion: 'second_half' },
            { name: 'X個Y元', price: 50, quantity: 7, promotion: 'bulk_discount', bulkQuantity: 3, bulkPrice: 100 }
        ];

        testCases.forEach(test => {
            const product = {
                ...test,
                customSubtotal: null
            };
            const subtotal = this.calculateSubtotal(product);
            const info = this.getPriceInfo(product);
            console.log(`${test.name} (${test.quantity}件 × $${test.price}): $${subtotal} (省 $${info.savings})`);
        });

        console.log('✅ 測試完成');
    }
}

// Create global price calculator instance
const priceCalculator = new PriceCalculator();

console.log('✅ PriceCalculator 模組已載入');
