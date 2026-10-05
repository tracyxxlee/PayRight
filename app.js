// ===== Global State =====
let currentPhoto = null; // Store current photo as base64
let currentPhotoFile = null; // Store the file object for processing

console.log('🛒 全聯購物金額統計 App 已啟動');
console.log('版本: 1.0.0');
console.log('開發階段: ✅ 所有功能開發完成！');

// ===== DOM Elements =====
const cameraBtn = document.getElementById('cameraBtn');
const cameraInput = document.getElementById('cameraInput');
const shoppingList = document.getElementById('shoppingList');
const emptyState = document.getElementById('emptyState');
const totalAmount = document.getElementById('totalAmount');
const clearAllBtn = document.getElementById('clearAllBtn');

// Modals
const photoPreviewModal = document.getElementById('photoPreviewModal');
const ocrResultModal = document.getElementById('ocrResultModal');
const editProductModal = document.getElementById('editProductModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

// ===== Event Listeners (Placeholder) =====
cameraBtn.addEventListener('click', () => {
    console.log('📷 拍照按鈕被點擊');
    cameraInput.click();
});

cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) {
        console.log('❌ 沒有選擇照片');
        return;
    }
    
    console.log('📸 照片已選擇:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    
    try {
        // Convert image to base64
        const base64 = await fileToBase64(file);
        currentPhoto = base64;
        currentPhotoFile = file;
        
        // Show photo preview
        showPhotoPreview(base64);
        
    } catch (error) {
        console.error('❌ 照片處理失敗:', error);
        showToast('照片處理失敗，請重試', 'error');
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
});

clearAllBtn.addEventListener('click', () => {
    console.log('🗑️ 清空清單按鈕被點擊');
    clearShoppingList();
});

// ===== OCR Result Modal Actions =====
document.getElementById('cancelOcrBtn').addEventListener('click', () => {
    console.log('❌ 取消加入商品');
    hideModal(ocrResultModal);
    currentPhoto = null;
    currentPhotoFile = null;
});

document.getElementById('confirmOcrBtn').addEventListener('click', () => {
    console.log('✅ 確認加入商品');
    
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const promotion = document.getElementById('promotionType').value;
    const quantity = parseInt(document.getElementById('productQuantity').value);
    
    let price, bulkQuantity, bulkPrice;
    
    if (promotion === 'bulk_discount') {
        // Get bulk discount values
        bulkQuantity = parseInt(document.getElementById('bulkQuantity').value);
        bulkPrice = parseFloat(document.getElementById('bulkPrice').value);
        price = 0; // Not used for bulk discount
    } else {
        // Get regular price
        price = parseFloat(document.getElementById('productPrice').value);
        bulkQuantity = null;
        bulkPrice = null;
    }
    
    // Validate form
    if (!validateProductForm(name, price, quantity, promotion, bulkQuantity, bulkPrice)) {
        return;
    }
    
    // Create product object
    const product = {
        id: generateId(),
        name: name,
        price: price,
        quantity: quantity,
        promotion: promotion,
        bulkQuantity: bulkQuantity,
        bulkPrice: bulkPrice,
        customSubtotal: null,
        photo: currentPhoto,
        timestamp: Date.now()
    };
    
    console.log('📦 新商品:', product);
    
    // Hide modal
    hideModal(ocrResultModal);
    
    // Add product to shopping list
    const addedProduct = productManager.addProduct(product);
    console.log('✅ 商品已加入購物清單');
    
    // Save to localStorage
    storageManager.saveProducts(productManager.getAllProducts());
    storageManager.savePhoto(addedProduct.id, addedProduct.photo);
    
    // Reset photo state
    currentPhoto = null;
    currentPhotoFile = null;
    
    // Update UI
    renderShoppingList();
    
    // Show success message
    if (addedProduct.quantity > product.quantity) {
        showToast(`已合併商品「${addedProduct.name}」，數量: ${addedProduct.quantity}`, 'success');
    } else {
        showToast('商品已加入購物清單！', 'success');
    }
});

// Real-time form validation for OCR modal
document.getElementById('productName').addEventListener('input', (e) => {
    const input = e.target;
    if (input.value.trim().length > 0) {
        input.style.borderColor = '';
    }
});

document.getElementById('productPrice').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value > 0) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

document.getElementById('productQuantity').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseInt(input.value);
    if (!isNaN(value) && value > 0 && Number.isInteger(value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('productQuantity', 'quantityError', 'promotionType', 'bulkQuantity');
});

// Enter key support for OCR modal
['productName', 'productPrice', 'productQuantity'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmOcrBtn').click();
        }
    });
});

// OCR modal promotion type change handler
document.getElementById('promotionType').addEventListener('change', (e) => {
    const promotionType = e.target.value;
    const productPriceGroup = document.getElementById('productPriceGroup');
    const bulkDiscountGroup = document.getElementById('bulkDiscountGroup');
    
    if (promotionType === 'bulk_discount') {
        productPriceGroup.style.display = 'none';
        bulkDiscountGroup.style.display = 'block';
        // Clear price field when switching to bulk discount
        document.getElementById('productPrice').value = '';
    } else {
        productPriceGroup.style.display = 'block';
        bulkDiscountGroup.style.display = 'none';
        // Clear bulk discount fields when switching away
        document.getElementById('bulkQuantity').value = '';
        document.getElementById('bulkPrice').value = '';
    }
    updateQuantityMultipleFeedback('productQuantity', 'quantityError', 'promotionType', 'bulkQuantity');
});

// Enter key support for OCR modal bulk discount fields
['bulkQuantity', 'bulkPrice'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmOcrBtn').click();
        }
    });
});

// Real-time form validation for Edit modal
document.getElementById('editProductName').addEventListener('input', (e) => {
    const input = e.target;
    if (input.value.trim().length > 0) {
        input.style.borderColor = '';
    }
});

document.getElementById('editProductPrice').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value > 0) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

document.getElementById('editProductQuantity').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseInt(input.value);
    if (!isNaN(value) && value > 0 && Number.isInteger(value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
});

document.getElementById('editCustomSubtotal').addEventListener('input', (e) => {
    const input = e.target;
    if (!input.value.trim()) {
        input.style.borderColor = ''; // Empty is valid
        return;
    }
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

// Real-time validation for OCR modal bulk discount fields
document.getElementById('bulkQuantity').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseInt(input.value);
    if (!isNaN(value) && value > 0 && Number.isInteger(value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('productQuantity', 'quantityError', 'promotionType', 'bulkQuantity');
});

document.getElementById('bulkPrice').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value > 0) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

// Real-time validation for Edit modal bulk discount fields
document.getElementById('editBulkQuantity').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseInt(input.value);
    if (!isNaN(value) && value > 0 && Number.isInteger(value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
});

document.getElementById('editBulkPrice').addEventListener('input', (e) => {
    const input = e.target;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value > 0) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

// Enter key support for Edit modal
['editProductName', 'editProductPrice', 'editProductQuantity', 'editCustomSubtotal'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmEditBtn').click();
        }
    });
});

// Edit modal promotion type change handler
document.getElementById('editPromotionType').addEventListener('change', (e) => {
    const promotionType = e.target.value;
    const editProductPriceGroup = document.getElementById('editProductPriceGroup');
    const editBulkDiscountGroup = document.getElementById('editBulkDiscountGroup');
    
    if (promotionType === 'bulk_discount') {
        editProductPriceGroup.style.display = 'none';
        editBulkDiscountGroup.style.display = 'block';
        // Clear price field when switching to bulk discount
        document.getElementById('editProductPrice').value = '';
    } else {
        editProductPriceGroup.style.display = 'block';
        editBulkDiscountGroup.style.display = 'none';
        // Clear bulk discount fields when switching away
        document.getElementById('editBulkQuantity').value = '';
        document.getElementById('editBulkPrice').value = '';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
});

// Enter key support for Edit modal bulk discount fields
['editBulkQuantity', 'editBulkPrice'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmEditBtn').click();
        }
    });
});

// ===== Camera & Photo Functions =====

/**
 * Convert file to base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            resolve(reader.result);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Show photo preview modal
 */
function showPhotoPreview(base64Image) {
    const previewImage = document.getElementById('previewImage');
    previewImage.src = base64Image;
    showModal(photoPreviewModal);
    console.log('✅ 顯示照片預覽');
}

/**
 * Compress image if too large
 */
async function compressImage(base64Image, maxSizeKB = 500) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions if image is too large
            const maxDimension = 1920;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try different quality levels to meet size requirement
            let quality = 0.9;
            let compressed = canvas.toDataURL('image/jpeg', quality);
            
            // Check size and reduce quality if needed
            while (compressed.length > maxSizeKB * 1024 && quality > 0.1) {
                quality -= 0.1;
                compressed = canvas.toDataURL('image/jpeg', quality);
            }
            
            console.log(`🗜️ 圖片壓縮: ${(base64Image.length / 1024).toFixed(2)} KB → ${(compressed.length / 1024).toFixed(2)} KB`);
            resolve(compressed);
        };
        
        img.src = base64Image;
    });
}

/**
 * Show OCR result confirmation modal
 */
function showOcrResultModal(productInfo, photoBase64) {
    // Set photo
    document.getElementById('ocrPhotoPreview').src = photoBase64;
    
    // Set product info (pre-fill with OCR results)
    document.getElementById('productName').value = productInfo.name || '';
    document.getElementById('productPrice').value = productInfo.price || '';
    document.getElementById('productQuantity').value = 1;
    document.getElementById('promotionType').value = 'none';
    document.getElementById('productPriceGroup').style.display = 'block';
    document.getElementById('bulkDiscountGroup').style.display = 'none';
    document.getElementById('bulkQuantity').value = '';
    document.getElementById('bulkPrice').value = '';
    clearQuantityError('quantityError', 'productQuantity');
    
    // Show modal
    showModal(ocrResultModal);
    
    // Show confidence if available
    if (productInfo.confidence) {
        console.log(`📊 OCR 信心度: ${productInfo.confidence.toFixed(2)}%`);
        if (productInfo.confidence < 60) {
            showToast('辨識準確度較低，請確認資訊', 'warning');
        }
    }
}

/**
 * X個Y元：數量必須是 X 的倍數。不符合時回傳錯誤訊息，符合或尚未可判斷時回傳 null。
 */
function validateBulkQuantity(quantity, bulkQuantity) {
    if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isInteger(bulkQuantity) || bulkQuantity <= 0) {
        return null;
    }
    if (quantity % bulkQuantity !== 0) {
        return `數量必須是 ${bulkQuantity} 的倍數`;
    }
    return null;
}

function showQuantityError(errorElementId, inputElement, message) {
    const errorEl = document.getElementById(errorElementId);
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    inputElement.style.borderColor = 'var(--danger-color)';
}

function clearQuantityError(errorElementId, inputElementId) {
    const errorEl = document.getElementById(errorElementId);
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    const inputElement = document.getElementById(inputElementId);
    const value = parseInt(inputElement.value, 10);
    if (!isNaN(value) && value > 0 && Number.isInteger(value)) {
        inputElement.style.borderColor = '';
    }
}

function updateQuantityMultipleFeedback(quantityInputId, errorId, promotionSelectId, bulkQuantityInputId) {
    const quantityInput = document.getElementById(quantityInputId);
    const promotion = document.getElementById(promotionSelectId).value;
    if (promotion !== 'bulk_discount') {
        clearQuantityError(errorId, quantityInputId);
        return null;
    }
    const quantity = parseInt(quantityInput.value, 10);
    const bulkQuantity = parseInt(document.getElementById(bulkQuantityInputId).value, 10);
    const message = validateBulkQuantity(quantity, bulkQuantity);
    if (message) {
        showQuantityError(errorId, quantityInput, message);
    } else {
        clearQuantityError(errorId, quantityInputId);
    }
    return message;
}

/**
 * Validate product form
 */
function validateProductForm(name, price, quantity, promotion, bulkQuantity, bulkPrice) {
    // Validate name
    if (!name || name.length === 0) {
        showToast('請輸入商品名稱', 'error');
        document.getElementById('productName').focus();
        return false;
    }
    
    // Validate quantity
    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        showToast('請輸入有效的數量（正整數）', 'error');
        document.getElementById('productQuantity').focus();
        return false;
    }
    
    if (promotion === 'bulk_discount') {
        // Validate bulk discount fields
        if (isNaN(bulkQuantity) || bulkQuantity <= 0 || !Number.isInteger(bulkQuantity)) {
            showToast('請輸入有效的X（數量，正整數）', 'error');
            document.getElementById('bulkQuantity').focus();
            return false;
        }
        
        if (isNaN(bulkPrice) || bulkPrice <= 0) {
            showToast('請輸入有效的Y（價格，大於0）', 'error');
            document.getElementById('bulkPrice').focus();
            return false;
        }

        const bulkQtyError = validateBulkQuantity(quantity, bulkQuantity);
        if (bulkQtyError) {
            showToast(bulkQtyError, 'error');
            const qtyInput = document.getElementById('productQuantity');
            showQuantityError('quantityError', qtyInput, bulkQtyError);
            qtyInput.focus();
            return false;
        }
    } else {
        // Validate price for non-bulk discount
        if (isNaN(price) || price <= 0) {
            showToast('請輸入有效的價格', 'error');
            document.getElementById('productPrice').focus();
            return false;
        }
    }
    
    return true;
}

/**
 * Generate unique ID
 */
function generateId() {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== UI Rendering Functions =====

/**
 * 渲染購物清單
 */
function renderShoppingList() {
    const products = productManager.getAllProducts();
    
    // Update empty state
    if (products.length === 0) {
        emptyState.style.display = 'block';
        clearAllBtn.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        clearAllBtn.style.display = 'inline-block';
    }
    
    // Clear existing products (except empty state)
    const existingProducts = shoppingList.querySelectorAll('.product-item');
    existingProducts.forEach(item => item.remove());
    
    // Render each product
    products.forEach(product => {
        const productElement = createProductElement(product);
        shoppingList.appendChild(productElement);
    });
    
    // Update total
    updateTotal();
    
    console.log('✅ 購物清單已更新:', products.length, '項商品');
}

/**
 * 創建商品元素
 */
function createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product-item';
    div.dataset.productId = product.id;
    
    // Get price info
    const priceInfo = priceCalculator.getPriceInfo(product);
    
    // Get photo
    const photo = storageManager.loadPhoto(product.id);
    
    div.innerHTML = `
        <div class="product-header">
            <div class="product-info">
                <div class="product-name">${escapeHtml(product.name)}</div>
            </div>
            ${photo ? `<img src="${photo}" class="product-photo-thumbnail" alt="商品照片" data-product-id="${product.id}">` : ''}
        </div>
        
        <div class="product-details">
            <div class="detail-item">
                <span class="detail-label">單價</span>
                <span class="detail-value">
                    ${product.promotion === 'bulk_discount' ? 
                        `${product.bulkQuantity}個${product.bulkPrice}元` : 
                        `$${product.price}`}
                </span>
            </div>
            <div class="detail-item">
                <span class="detail-label">數量</span>
                <span class="detail-value">×${product.quantity}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">特價</span>
                <span class="detail-value">
                    ${product.promotion !== 'none' ? 
                        `<span class="promotion-badge">${priceInfo.promotionName}</span>` : 
                        '無'}
                </span>
            </div>
            ${priceInfo.savings > 0 ? `
            <div class="detail-item">
                <span class="detail-label">節省</span>
                <span class="detail-value" style="color: var(--success-color);">$${priceInfo.savings}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="product-subtotal">
            <span class="subtotal-label">小計</span>
            <span class="subtotal-value">$${priceInfo.subtotal}</span>
        </div>
        
        <div class="product-actions">
            <button class="btn-edit" data-product-id="${product.id}">✏️ 編輯</button>
            <button class="btn-delete" data-product-id="${product.id}">🗑️ 刪除</button>
        </div>
    `;
    
    // Add event listeners for photo click
    const photoThumb = div.querySelector('.product-photo-thumbnail');
    if (photoThumb) {
        photoThumb.addEventListener('click', () => {
            showPhotoModal(photo);
        });
    }
    
    // Add event listeners for edit/delete buttons
    const editBtn = div.querySelector('.btn-edit');
    const deleteBtn = div.querySelector('.btn-delete');
    
    editBtn.addEventListener('click', () => {
        console.log('✏️ 編輯商品:', product.id);
        showEditProductModal(product.id);
    });
    
    deleteBtn.addEventListener('click', () => {
        console.log('🗑️ 刪除商品:', product.id);
        deleteProduct(product.id);
    });
    
    return div;
}

/**
 * 更新總金額
 */
function updateTotal() {
    const products = productManager.getAllProducts();
    const total = priceCalculator.calculateTotal(products);
    totalAmount.textContent = `$${total}`;
}

/**
 * 顯示照片彈窗（放大查看）
 */
function showPhotoModal(photoBase64) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90vh;">
            <div class="modal-header">
                <h3>商品照片</h3>
                <button class="btn-close" id="closePhotoModal">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${photoBase64}" style="width: 100%; height: auto; border-radius: var(--radius-md);" alt="商品照片">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button
    document.getElementById('closePhotoModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Product Edit Functions =====

let currentEditingProductId = null;

/**
 * 顯示編輯商品彈窗
 */
function showEditProductModal(productId) {
    const product = productManager.getProductById(productId);
    
    if (!product) {
        console.error('❌ 找不到商品:', productId);
        showToast('找不到商品', 'error');
        return;
    }
    
    currentEditingProductId = productId;
    
    // Get photo
    const photo = storageManager.loadPhoto(productId);
    
    // Fill form with current product data
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductQuantity').value = product.quantity;
    document.getElementById('editPromotionType').value = product.promotion;
    document.getElementById('editCustomSubtotal').value = product.customSubtotal || '';
    
    // Handle bulk discount fields
    const editProductPriceGroup = document.getElementById('editProductPriceGroup');
    const editBulkDiscountGroup = document.getElementById('editBulkDiscountGroup');
    
    if (product.promotion === 'bulk_discount') {
        // Show bulk discount fields, hide price field
        editProductPriceGroup.style.display = 'none';
        editBulkDiscountGroup.style.display = 'block';
        document.getElementById('editBulkQuantity').value = product.bulkQuantity || '';
        document.getElementById('editBulkPrice').value = product.bulkPrice || '';
    } else {
        // Show price field, hide bulk discount fields
        editProductPriceGroup.style.display = 'block';
        editBulkDiscountGroup.style.display = 'none';
        document.getElementById('editBulkQuantity').value = '';
        document.getElementById('editBulkPrice').value = '';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
    
    // Show photo
    if (photo) {
        document.getElementById('editPhotoPreview').src = photo;
        document.getElementById('editPhotoPreview').style.display = 'block';
    } else {
        document.getElementById('editPhotoPreview').style.display = 'none';
    }
    
    // Show modal
    showModal(editProductModal);
    
    console.log('📝 開啟編輯視窗:', product.name);
}

/**
 * 儲存編輯的商品
 */
function saveEditedProduct() {
    if (!currentEditingProductId) {
        console.error('❌ 沒有正在編輯的商品');
        return;
    }
    
    // Get form values
    const name = document.getElementById('editProductName').value.trim();
    const promotion = document.getElementById('editPromotionType').value;
    const quantity = parseInt(document.getElementById('editProductQuantity').value);
    const customSubtotalInput = document.getElementById('editCustomSubtotal').value.trim();
    const customSubtotal = customSubtotalInput ? parseFloat(customSubtotalInput) : null;
    
    let price, bulkQuantity, bulkPrice;
    
    if (promotion === 'bulk_discount') {
        // Get bulk discount values
        bulkQuantity = parseInt(document.getElementById('editBulkQuantity').value);
        bulkPrice = parseFloat(document.getElementById('editBulkPrice').value);
        price = 0; // Not used for bulk discount
    } else {
        // Get regular price
        price = parseFloat(document.getElementById('editProductPrice').value);
        bulkQuantity = null;
        bulkPrice = null;
    }
    
    // Validate form
    if (!validateEditForm(name, price, quantity, customSubtotal, promotion, bulkQuantity, bulkPrice)) {
        return;
    }
    
    // Update product
    const success = productManager.updateProduct(currentEditingProductId, {
        name: name,
        price: price,
        quantity: quantity,
        promotion: promotion,
        bulkQuantity: bulkQuantity,
        bulkPrice: bulkPrice,
        customSubtotal: customSubtotal
    });
    
    if (success) {
        // Save to localStorage
        storageManager.saveProducts(productManager.getAllProducts());
        
        // Update UI
        renderShoppingList();
        
        // Hide modal
        hideModal(editProductModal);
        currentEditingProductId = null;
        
        // Show success message
        showToast('商品已更新', 'success');
        console.log('✅ 商品已更新');
    } else {
        showToast('更新失敗', 'error');
    }
}

/**
 * 驗證編輯表單
 */
function validateEditForm(name, price, quantity, customSubtotal, promotion, bulkQuantity, bulkPrice) {
    // Validate name
    if (!name || name.length === 0) {
        showToast('請輸入商品名稱', 'error');
        document.getElementById('editProductName').focus();
        return false;
    }
    
    // Validate quantity
    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        showToast('請輸入有效的數量（正整數）', 'error');
        document.getElementById('editProductQuantity').focus();
        return false;
    }
    
    if (promotion === 'bulk_discount') {
        // Validate bulk discount fields
        if (isNaN(bulkQuantity) || bulkQuantity <= 0 || !Number.isInteger(bulkQuantity)) {
            showToast('請輸入有效的X（數量，正整數）', 'error');
            document.getElementById('editBulkQuantity').focus();
            return false;
        }
        
        if (isNaN(bulkPrice) || bulkPrice <= 0) {
            showToast('請輸入有效的Y（價格，大於0）', 'error');
            document.getElementById('editBulkPrice').focus();
            return false;
        }

        const bulkQtyError = validateBulkQuantity(quantity, bulkQuantity);
        if (bulkQtyError) {
            showToast(bulkQtyError, 'error');
            const qtyInput = document.getElementById('editProductQuantity');
            showQuantityError('editQuantityError', qtyInput, bulkQtyError);
            qtyInput.focus();
            return false;
        }
    } else {
        // Validate price for non-bulk discount
        if (isNaN(price) || price <= 0) {
            showToast('請輸入有效的價格', 'error');
            document.getElementById('editProductPrice').focus();
            return false;
        }
    }
    
    // Validate custom subtotal if provided
    if (customSubtotal !== null && (isNaN(customSubtotal) || customSubtotal < 0)) {
        showToast('自訂小計必須為非負數', 'error');
        document.getElementById('editCustomSubtotal').focus();
        return false;
    }
    
    return true;
}

// ===== Product Delete Functions =====

/**
 * 刪除單個商品
 */
function deleteProduct(productId) {
    const product = productManager.getProductById(productId);
    
    if (!product) {
        console.error('❌ 找不到商品:', productId);
        showToast('找不到商品', 'error');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`確定要刪除「${product.name}」嗎？`)) {
        console.log('❌ 取消刪除');
        return;
    }
    
    console.log('🗑️ 刪除商品:', product.name);
    
    // Delete from product manager
    const success = productManager.deleteProduct(productId);
    
    if (success) {
        // Delete photo
        storageManager.deletePhoto(productId);
        
        // Save to localStorage
        storageManager.saveProducts(productManager.getAllProducts());
        
        // Update UI
        renderShoppingList();
        
        // Show success message
        showToast(`已刪除「${product.name}」`, 'success');
        console.log('✅ 商品已刪除');
    } else {
        showToast('刪除失敗', 'error');
    }
}

/**
 * 清空購物清單
 */
function clearShoppingList() {
    if (productManager.isEmpty()) {
        showToast('購物清單已經是空的', 'info');
        return;
    }
    
    const count = productManager.getProductCount();
    
    // Confirm clear all
    if (!confirm(`確定要清空購物清單嗎？（${count} 項商品）`)) {
        console.log('❌ 取消清空');
        return;
    }
    
    console.log('🗑️ 清空購物清單');
    
    // Clear all products
    productManager.clearAll();
    
    // Clear all data from storage
    storageManager.clearAll();
    
    // Update UI
    renderShoppingList();
    
    // Show success message
    showToast(`已清空 ${count} 項商品`, 'success');
    console.log('✅ 購物清單已清空');
}

// ===== Helper Functions (Placeholder) =====

/**
 * Show modal
 */
function showModal(modalElement) {
    modalElement.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Hide modal
 */
function hideModal(modalElement) {
    modalElement.classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * Show loading overlay
 */
function showLoading(text = '處理中...') {
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text;
    loadingOverlay.classList.add('show');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.classList.remove('show');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Modal Close Buttons =====
document.getElementById('closePreviewBtn').addEventListener('click', () => {
    hideModal(photoPreviewModal);
    currentPhoto = null;
    currentPhotoFile = null;
});

document.getElementById('closeOcrBtn').addEventListener('click', () => {
    hideModal(ocrResultModal);
});

document.getElementById('closeEditBtn').addEventListener('click', () => {
    hideModal(editProductModal);
    currentEditingProductId = null;
});

// Edit modal actions
document.getElementById('cancelEditBtn').addEventListener('click', () => {
    console.log('❌ 取消編輯');
    hideModal(editProductModal);
    currentEditingProductId = null;
});

document.getElementById('confirmEditBtn').addEventListener('click', () => {
    console.log('✅ 確認編輯');
    saveEditedProduct();
});

// Close modal when clicking outside
[photoPreviewModal, ocrResultModal, editProductModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
            if (modal === photoPreviewModal) {
                currentPhoto = null;
                currentPhotoFile = null;
            } else if (modal === editProductModal) {
                currentEditingProductId = null;
            }
        }
    });
});

// ===== Photo Preview Actions =====
document.getElementById('retakeBtn').addEventListener('click', () => {
    console.log('🔄 重新拍照');
    hideModal(photoPreviewModal);
    currentPhoto = null;
    currentPhotoFile = null;
    // Trigger camera again
    cameraInput.click();
});

document.getElementById('confirmPhotoBtn').addEventListener('click', async () => {
    console.log('✅ 確認使用照片');
    hideModal(photoPreviewModal);
    
    if (!currentPhoto) {
        showToast('沒有照片可處理', 'error');
        return;
    }
    
    // Show loading
    showLoading('辨識中...');
    
    try {
        // Compress image for better performance
        const compressed = await compressImage(currentPhoto);
        currentPhoto = compressed;
        
        // Perform OCR recognition
        const ocrResult = await ocrService.recognize(currentPhoto);
        
        // Parse product info from OCR result
        const productInfo = ocrService.parseProductInfo(ocrResult);
        
        hideLoading();
        
        // Show OCR result modal for user confirmation
        showOcrResultModal(productInfo, currentPhoto);
        
    } catch (error) {
        hideLoading();
        console.error('❌ OCR 處理失敗:', error);
        showToast('文字辨識失敗，請重試或手動輸入', 'error');
        
        // Still show modal but with empty fields for manual input
        showOcrResultModal({ name: '', price: null, confidence: 0 }, currentPhoto);
    }
});

// ===== Initialize App =====
console.log('✅ App 初始化完成');
console.log('📱 相機功能已就緒');
console.log('🔍 OCR 辨識引擎已載入');
console.log('📝 辨識結果確認介面已就緒');
console.log('🛍️ 商品管理模組已載入');
console.log('� 特價計算模組已載入');
console.log('�💡 點擊「拍照掃描商品」按鈕開始使用');

// Test price calculator (optional debug)
// priceCalculator.debugTest();


// ===== Initialize App =====
// Load saved data
const savedProducts = storageManager.loadProducts();
if (savedProducts && savedProducts.length > 0) {
    productManager.importData({ products: savedProducts });
    console.log('📂 已載入', savedProducts.length, '項商品');
    
    // Render initial shopping list
    renderShoppingList();
}

console.log('✅ App 初始化完成');
console.log('📱 相機功能已就緒');
console.log('🔍 OCR 辨識引擎已載入');
console.log('📝 辨識結果確認介面已就緒');
console.log('🛍️ 商品管理模組已載入');
console.log('💰 特價計算模組已載入');
console.log('💾 資料儲存模組已載入');
console.log('🎨 UI 渲染功能已就緒');
console.log('💡 點擊「拍照掃描商品」按鈕開始使用');
