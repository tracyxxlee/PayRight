// ===== Global State =====
let currentPhoto = null; // Store current photo as base64

// 滿 30 筆只警告，不阻擋。之後可做成設定，讓使用者依手機能力調整。
const LIST_SIZE_WARNING = 30;

console.log('🛒 別多付 App 已啟動');
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

// 點進欄位時全選內容，方便直接覆寫
document.addEventListener('focusin', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains('form-input')) {
        return;
    }
    input.select();
});

// ===== Event Listeners (Placeholder) =====
cameraBtn.addEventListener('click', () => {
    console.log('📷 拍照按鈕被點擊');
    openCamera();
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
});

document.getElementById('confirmOcrBtn').addEventListener('click', async () => {
    console.log('✅ 確認加入商品');

    // Get form values
    const name = document.getElementById('productName').value.trim();
    const promotion = document.getElementById('promotionType').value;
    const quantity = readPositiveInteger(document.getElementById('productQuantity').value);

    let price, bulkQuantity, bulkPrice, customSubtotal;

    if (promotion === 'bulk_discount') {
        // Get bulk discount values
        bulkQuantity = parseInt(document.getElementById('bulkQuantity').value);
        bulkPrice = parseFloat(document.getElementById('bulkPrice').value);
        price = 0; // Not used for bulk discount
        customSubtotal = null;
    } else if (promotion === 'custom_subtotal') {
        price = parseFloat(document.getElementById('productPrice').value);
        bulkQuantity = null;
        bulkPrice = null;
        const customSubtotalInput = document.getElementById('productCustomSubtotal').value.trim();
        customSubtotal = customSubtotalInput === '' ? null : parseFloat(customSubtotalInput);
    } else {
        // Get regular price
        price = parseFloat(document.getElementById('productPrice').value);
        bulkQuantity = null;
        bulkPrice = null;
        customSubtotal = null;
    }

    // Validate form
    if (!validateProductForm(name, price, quantity, promotion, bulkQuantity, bulkPrice, customSubtotal)) {
        return;
    }

    // 流水號由 ProductManager 指定，這裡不帶 id
    let photo = null;
    if (currentPhoto) {
        try {
            photo = await createStoredThumbnail(currentPhoto);
        } catch (error) {
            console.error('縮圖失敗:', error);
            showToast('照片無法儲存，商品仍會加入', 'warning');
        }
    }

    const product = {
        name: name,
        price: price,
        quantity: quantity,
        promotion: promotion,
        bulkQuantity: bulkQuantity,
        bulkPrice: bulkPrice,
        customSubtotal: customSubtotal,
        photo: photo
    };

    console.log('📦 新商品:', product);

    hideModal(ocrResultModal);

    const addResult = productManager.addProduct(product);
    console.log('✅ 商品已加入購物清單', addResult.product.serial);

    currentPhoto = null;
    renderShoppingList();
    const count = productManager.getProductCount();
    if (count >= LIST_SIZE_WARNING) {
        showToast(`購物清單已有 ${count} 筆，仍可繼續加入`, 'warning');
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

document.getElementById('productQuantity').addEventListener('keydown', blockNonIntegerKeys);
document.getElementById('productQuantity').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('productQuantity', 'quantityError', 'promotionType', 'bulkQuantity');
});

// Enter key support for OCR modal
['productName', 'productPrice', 'productQuantity', 'productCustomSubtotal'].forEach(fieldId => {
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
    setOcrPromotionFields(promotionType);

    if (promotionType === 'bulk_discount') {
        document.getElementById('productPrice').value = '';
    } else {
        document.getElementById('bulkQuantity').value = '';
        document.getElementById('bulkPrice').value = '';
    }
    if (promotionType !== 'custom_subtotal') {
        document.getElementById('productCustomSubtotal').value = '';
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

document.getElementById('editProductQuantity').addEventListener('keydown', blockNonIntegerKeys);
document.getElementById('editProductQuantity').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    if (readPositiveInteger(input.value)) {
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
    setEditPromotionFields(promotionType);

    if (promotionType === 'bulk_discount') {
        document.getElementById('editProductPrice').value = '';
    } else {
        document.getElementById('editBulkQuantity').value = '';
        document.getElementById('editBulkPrice').value = '';
    }
    if (promotionType !== 'custom_subtotal') {
        document.getElementById('editCustomSubtotal').value = '';
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

function isNativeApp() {
    return Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

/**
 * Android WebView ignores capture="environment" and opens the gallery.
 * Inside the app, call the system camera. In a browser, keep the file input.
 */
async function openCamera() {
    if (!isNativeApp()) {
        cameraInput.click();
        return;
    }

    try {
        const photo = await window.Capacitor.nativePromise('Camera', 'getPhoto', {
            quality: 100,
            allowEditing: false,
            resultType: 'dataUrl',
            source: 'CAMERA',
            correctOrientation: true,
            saveToGallery: false,
        });

        if (!photo || !photo.dataUrl) {
            showToast('沒有取得照片，請重試', 'error');
            return;
        }

        currentPhoto = photo.dataUrl;
        showPhotoPreview(currentPhoto);
    } catch (error) {
        const message = String(error && error.message ? error.message : error || '');
        if (/cancel/i.test(message)) {
            console.log('使用者取消拍照');
            return;
        }
        console.error('❌ 無法開啟相機:', error);
        showToast('無法開啟相機，請允許相機權限後重試', 'error');
    }
}

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
    return new Promise((resolve, reject) => {
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

        img.onerror = () => {
            reject(new Error('圖片無法讀取'));
        };

        img.src = base64Image;
    });
}

const THUMB_MIN_BYTES = 80 * 1024;
const THUMB_MAX_BYTES = 150 * 1024;

function dataUrlByteSize(dataUrl) {
    const base64 = String(dataUrl).split(',')[1] || '';
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.floor((base64.length * 3) / 4) - padding;
}

function renderJpeg(img, maxEdge, quality) {
    let width = img.width;
    let height = img.height;
    const longest = Math.max(width, height);
    if (longest > maxEdge) {
        const scale = maxEdge / longest;
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 清單裡只留縮圖，單張盡量落在 80–150KB。
 * 原圖太小而達不到 80KB 時，保留較清楚的那張，不放大。
 */
function createStoredThumbnail(base64Image) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let maxEdge = 1280;
            let smallest = null;

            while (maxEdge >= 240) {
                let quality = 0.92;
                let encoded = renderJpeg(img, maxEdge, quality);
                let size = dataUrlByteSize(encoded);

                while (size > THUMB_MAX_BYTES && quality > 0.4) {
                    quality = Math.round((quality - 0.06) * 100) / 100;
                    encoded = renderJpeg(img, maxEdge, quality);
                    size = dataUrlByteSize(encoded);
                }

                if (size <= THUMB_MAX_BYTES) {
                    if (size >= THUMB_MIN_BYTES || smallest === null) {
                        smallest = encoded;
                    }
                    if (size >= THUMB_MIN_BYTES) {
                        console.log(`縮圖 ${(size / 1024).toFixed(1)} KB`);
                        resolve(encoded);
                        return;
                    }
                    break;
                }

                maxEdge = Math.round(maxEdge * 0.75);
            }

            const result = smallest || renderJpeg(img, 240, 0.4);
            console.log(`縮圖 ${(dataUrlByteSize(result) / 1024).toFixed(1)} KB`);
            resolve(result);
        };
        img.onerror = () => reject(new Error('圖片無法讀取'));
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
    setOcrPromotionFields('none');
    document.getElementById('bulkQuantity').value = '';
    document.getElementById('bulkPrice').value = '';
    document.getElementById('productCustomSubtotal').value = '';
    clearQuantityError('quantityError', 'productQuantity');

    // Show modal
    showModal(ocrResultModal);

    const confidence = Number(productInfo.confidence);
    if (Number.isFinite(confidence) && confidence > 0) {
        console.log(`📊 OCR 信心度: ${confidence.toFixed(2)}%`);
        if (confidence < 60) {
            showToast('辨識準確度較低，請確認資訊', 'warning');
        }
    } else if (!productInfo.name && productInfo.price == null) {
        showToast('未辨識到文字，請手動輸入', 'warning');
    }
}

function blockNonIntegerKeys(event) {
    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
        event.preventDefault();
    }
}

function sanitizePositiveIntegerField(input) {
    const raw = input.value;
    if (raw === '') {
        return;
    }
    const digits = raw.split(/[.,eE+]/)[0].replace(/\D/g, '').replace(/^0+/, '');
    if (digits !== raw) {
        input.value = digits;
    }
}

function readPositiveInteger(raw) {
    const text = String(raw).trim();
    if (!/^[1-9]\d*$/.test(text)) {
        return NaN;
    }
    return Number(text);
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
    const value = readPositiveInteger(inputElement.value);
    if (value) {
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
    const quantity = readPositiveInteger(quantityInput.value);
    const bulkQuantity = readPositiveInteger(document.getElementById(bulkQuantityInputId).value);
    const message = validateBulkQuantity(quantity, bulkQuantity);
    if (message) {
        showQuantityError(errorId, quantityInput, message);
    } else {
        clearQuantityError(errorId, quantityInputId);
    }
    return message;
}

function setEditPromotionFields(promotionType) {
    const isBulk = promotionType === 'bulk_discount';
    const isCustom = promotionType === 'custom_subtotal';
    document.getElementById('editProductPriceGroup').style.display = isBulk ? 'none' : 'block';
    document.getElementById('editBulkDiscountGroup').style.display = isBulk ? 'block' : 'none';
    document.getElementById('editCustomSubtotalGroup').style.display = isCustom ? 'block' : 'none';
}

function setOcrPromotionFields(promotionType) {
    const isBulk = promotionType === 'bulk_discount';
    const isCustom = promotionType === 'custom_subtotal';
    document.getElementById('productPriceGroup').style.display = isBulk ? 'none' : 'block';
    document.getElementById('bulkDiscountGroup').style.display = isBulk ? 'block' : 'none';
    document.getElementById('customSubtotalGroup').style.display = isCustom ? 'block' : 'none';
}

/**
 * Validate product form
 */
function validateProductForm(name, price, quantity, promotion, bulkQuantity, bulkPrice, customSubtotal) {
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

        if (promotion === 'custom_subtotal' && (customSubtotal === null || isNaN(customSubtotal) || customSubtotal < 0)) {
            showToast('請輸入有效的自訂小計', 'error');
            document.getElementById('productCustomSubtotal').focus();
            return false;
        }
    }

    return true;
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

    const photo = product.photo;

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

    const photo = product.photo;

    // Fill form with current product data
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editProductQuantity').value = product.quantity;
    document.getElementById('editPromotionType').value = product.promotion;
    document.getElementById('editCustomSubtotal').value =
        product.promotion === 'custom_subtotal' && product.customSubtotal !== null && product.customSubtotal !== undefined
            ? product.customSubtotal
            : '';

    if (product.promotion === 'bulk_discount') {
        document.getElementById('editBulkQuantity').value = product.bulkQuantity || '';
        document.getElementById('editBulkPrice').value = product.bulkPrice || '';
    } else {
        document.getElementById('editBulkQuantity').value = '';
        document.getElementById('editBulkPrice').value = '';
    }
    setEditPromotionFields(product.promotion);
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
    const quantity = readPositiveInteger(document.getElementById('editProductQuantity').value);
    const customSubtotalInput = document.getElementById('editCustomSubtotal').value.trim();
    const customSubtotal = promotion === 'custom_subtotal' && customSubtotalInput !== ''
        ? parseFloat(customSubtotalInput)
        : null;

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
    if (promotion === 'custom_subtotal' && customSubtotal === null) {
        showToast('請輸入有效的自訂小計', 'error');
        document.getElementById('editCustomSubtotal').focus();
        return false;
    }
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
function showLoading(text = '處理中...', options = {}) {
    const { cancellable = false, onCancel = null } = options;
    const loadingText = document.getElementById('loadingText');
    const cancelBtn = document.getElementById('loadingCancelBtn');

    loadingText.textContent = text;

    if (cancellable && onCancel) {
        cancelBtn.hidden = false;
        cancelBtn.onclick = () => {
            cancelBtn.disabled = true;
            onCancel();
        };
    } else {
        cancelBtn.hidden = true;
        cancelBtn.disabled = false;
        cancelBtn.onclick = null;
    }

    loadingOverlay.classList.add('show');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const cancelBtn = document.getElementById('loadingCancelBtn');
    loadingOverlay.classList.remove('show');
    cancelBtn.hidden = true;
    cancelBtn.disabled = false;
    cancelBtn.onclick = null;
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
    // Trigger camera again
    openCamera();
});

document.getElementById('confirmPhotoBtn').addEventListener('click', async () => {
    console.log('✅ 確認使用照片');
    hideModal(photoPreviewModal);

    if (!currentPhoto) {
        showToast('沒有照片可處理', 'error');
        return;
    }

    showLoading('辨識中...', {
        cancellable: true,
        onCancel: () => ocrService.cancel(),
    });

    try {
        // OCR 使用相機原圖；加入清單時再由 createStoredThumbnail 壓縮
        const ocrResult = await ocrService.recognize(currentPhoto);

        // Parse product info from OCR result
        const productInfo = ocrService.parseProductInfo(ocrResult);

        hideLoading();

        // Show OCR result modal for user confirmation
        showOcrResultModal(productInfo, currentPhoto);

    } catch (error) {
        hideLoading();
        console.error('❌ OCR 處理失敗:', error);
        if (error && error.code === 'OCR_CANCELLED') {
            showToast('已取消辨識，請手動填寫商品資訊', 'info');
            showOcrResultModal({ name: '', price: null, confidence: 0 }, currentPhoto);
            return;
        }
        if (error && error.code === 'OCR_TIMEOUT') {
            showToast('辨識失敗', 'error');
        } else {
            showToast('文字辨識失敗，請重試或手動輸入', 'error');
        }

        showOcrResultModal({ name: '', price: null, confidence: 0 }, currentPhoto);
    }
});

// 啟動時預熱 OCR Worker，避免首次拍照才載入語料
ocrService.initialize().catch((err) => {
    console.warn('OCR 預熱失敗（首次辨識時會再試）:', err);
});
