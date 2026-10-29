// ===== Global State =====
let currentPhoto = null; // Store current photo as base64

// 滿 30 筆只警告，不阻擋。之後可做成設定，讓使用者依手機能力調整。
const LIST_SIZE_WARNING = 30;

console.log('🛒 別多付 App 已啟動');
console.log('版本: 1.0.0');
console.log('開發階段: ✅ 所有功能開發完成！');

// ===== Status Bar（白底用 LIGHT = 深色圖示） =====
function isNativeApp() {
    return Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

async function configureStatusBar() {
    if (!isNativeApp()) {
        return;
    }

    try {
        // 永久顯示狀態列；內容不疊在狀態列底下（搭配 Android theme opt-out edge-to-edge）
        await window.Capacitor.nativePromise('StatusBar', 'show');
        await window.Capacitor.nativePromise('StatusBar', 'setOverlaysWebView', { overlay: false });
        // LIGHT = 深色文字／圖示，適合淺色背景；DARK = 淺色圖示，適合深色背景
        await window.Capacitor.nativePromise('StatusBar', 'setStyle', { style: 'LIGHT' });
        await window.Capacitor.nativePromise('StatusBar', 'setBackgroundColor', { color: '#FFFFFF' });
    } catch (error) {
        console.warn('狀態列設定略過:', error);
    }
}

configureStatusBar();

// ===== DOM Elements =====
const cameraBtn = document.getElementById('cameraBtn');
const cameraInput = document.getElementById('cameraInput');
const shoppingList = document.getElementById('shoppingList');
const shoppingListSection = document.getElementById('shoppingListSection');
const totalSection = document.getElementById('totalSection');
const totalAmount = document.getElementById('totalAmount');
const clearAllBtn = document.getElementById('clearAllBtn');

// Modals
const fullImageModal = document.getElementById('fullImageModal');
const editProductModal = document.getElementById('editProductModal');
const toast = document.getElementById('toast');

// 點進欄位時全選內容，並清掉上次儲存留下的金額上限錯誤
document.addEventListener('focusin', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLElement) || !editProductModal.contains(input)) {
        return;
    }
    if (input.classList.contains('form-input') || input.classList.contains('form-select')) {
        clearEditAmountError();
    }
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
        const base64 = await fileToBase64(file);
        currentPhoto = base64;
        showAddProductModal(base64);
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

// Real-time form validation for Edit modal
document.getElementById('editProductName').addEventListener('input', (e) => {
    const input = e.target;
    clearFieldError('editNameError', 'editProductName');
    if (input.value.trim().length === 0) {
        // 空值時不標紅，等送出再顯示錯誤
        input.style.borderColor = '';
    }
});

['editProductPrice', 'editCustomSubtotal', 'editBulkQuantity', 'editBulkPrice'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keydown', blockNonIntegerKeys);
});

document.getElementById('editProductPrice').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    clearFieldError('editPriceError', 'editProductPrice');
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else if (input.value.trim()) {
        input.style.borderColor = 'var(--danger-color)';
    }
});

document.getElementById('editProductQuantity').addEventListener('keydown', blockNonIntegerKeys);
document.getElementById('editProductQuantity').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else if (input.value.trim()) {
        input.style.borderColor = 'var(--danger-color)';
    } else {
        input.style.borderColor = '';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
});

document.getElementById('editCustomSubtotal').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    clearFieldError('editCustomSubtotalError', 'editCustomSubtotal');
    if (!input.value.trim()) {
        input.style.borderColor = ''; // Empty is valid until submit
        return;
    }
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else {
        input.style.borderColor = 'var(--danger-color)';
    }
});

// Real-time validation for Edit modal bulk discount fields
document.getElementById('editBulkQuantity').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    clearFieldError('editBulkQuantityError', 'editBulkQuantity');
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else if (input.value.trim()) {
        input.style.borderColor = 'var(--danger-color)';
    }
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
});

document.getElementById('editBulkPrice').addEventListener('input', (e) => {
    const input = e.target;
    sanitizePositiveIntegerField(input);
    clearFieldError('editBulkPriceError', 'editBulkPrice');
    if (readPositiveInteger(input.value)) {
        input.style.borderColor = '';
    } else if (input.value.trim()) {
        input.style.borderColor = 'var(--danger-color)';
    }
});

// Enter key support for Edit modal
['editProductName', 'editProductPrice', 'editProductQuantity', 'editCustomSubtotal'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const confirmBtn = document.getElementById('confirmEditBtn');
            if (!confirmBtn.disabled) {
                confirmBtn.click();
            }
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
    clearEditFormFieldErrors();
    clearEditAmountError();
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');

    // 選完特價後，focus 跳到下一個畫面上可見的欄位（等欄位顯示切換完成）
    requestAnimationFrame(() => {
        focusNextVisibleEditField('editPromotionType');
    });
});

// Enter key support for Edit modal bulk discount fields
['editBulkQuantity', 'editBulkPrice'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const confirmBtn = document.getElementById('confirmEditBtn');
            if (!confirmBtn.disabled) {
                confirmBtn.click();
            }
        }
    });
});

// ===== Camera & Photo Functions =====

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
        showAddProductModal(currentPhoto);
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
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('無法初始化 Canvas Context');
    }
    ctx.drawImage(img, 0, 0, width, height);
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
    const digits = raw.split(/[.,eE+]/)[0].replace(/\D/g, '').replace(/^0+(?=\d)/, '');
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

/** 清單／提示用顯示名稱；品名空白時顯示佔位文字 */
function getProductDisplayName(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed || '';
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

function showFieldError(errorElementId, inputElement, message) {
    const errorEl = document.getElementById(errorElementId);
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    inputElement.style.borderColor = 'var(--danger-color)';
}

function clearFieldError(errorElementId, inputElementId) {
    const errorEl = document.getElementById(errorElementId);
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    document.getElementById(inputElementId).style.borderColor = '';
}

function showQuantityError(errorElementId, inputElement, message) {
    showFieldError(errorElementId, inputElement, message);
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

function clearEditFormFieldErrors() {
    clearFieldError('editNameError', 'editProductName');
    clearFieldError('editPriceError', 'editProductPrice');
    clearFieldError('editCustomSubtotalError', 'editCustomSubtotal');
    clearFieldError('editBulkQuantityError', 'editBulkQuantity');
    clearFieldError('editBulkPriceError', 'editBulkPrice');
    clearQuantityError('editQuantityError', 'editProductQuantity');
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
    const hidePrice = isBulk || isCustom;
    document.getElementById('editProductPriceGroup').style.display = hidePrice ? 'none' : 'block';
    document.getElementById('editPriceQuantityRow')?.classList.toggle('price-hidden', hidePrice);
    document.getElementById('editBulkDiscountGroup').style.display = isBulk ? 'block' : 'none';
    document.getElementById('editCustomSubtotalGroup').style.display = isCustom ? 'block' : 'none';
}

/**
 * 判斷編輯表單欄位是否目前可見（祖先沒有 display:none）
 */
function isEditFieldVisible(el) {
    if (!el || !(el instanceof HTMLElement)) {
        return false;
    }
    let node = el;
    while (node && node !== editProductModal) {
        if (window.getComputedStyle(node).display === 'none') {
            return false;
        }
        node = node.parentElement;
    }
    return true;
}

/**
 * 將 focus 移到指定欄位之後、下一個畫面上可見的輸入欄位
 */
function focusNextVisibleEditField(afterElementId) {
    const modalBody = editProductModal.querySelector('.modal-body');
    if (!modalBody) {
        return;
    }
    const fields = Array.from(modalBody.querySelectorAll('input.form-input, select.form-select'));
    const startIndex = fields.findIndex(el => el.id === afterElementId);
    if (startIndex === -1) {
        return;
    }
    for (let i = startIndex + 1; i < fields.length; i++) {
        const field = fields[i];
        if (isEditFieldVisible(field)) {
            field.focus();
            return;
        }
    }
}

// ===== UI Rendering Functions =====

/**
 * 渲染購物清單
 */
function renderShoppingList() {
    const products = productManager.getAllProducts();

    // 空清單：只顯示「新增商品」；有商品才顯示清單與總金額
    const hasProducts = products.length > 0;
    shoppingListSection.style.display = hasProducts ? 'flex' : 'none';
    totalSection.style.display = hasProducts ? 'block' : 'none';
    document.querySelector('.main-content')?.classList.toggle('has-products', hasProducts);

    // Clear existing products
    const existingProducts = shoppingList.querySelectorAll('.product-swipe-container');
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
 * 創建商品元素（左右滑可刪除；點選整列進入編輯）
 */
function createProductElement(product) {
    const container = document.createElement('div');
    container.className = 'product-swipe-container';
    container.dataset.productId = product.id;

    const photo = product.photo;
    const promotionName = priceCalculator.getPromotionName(product.promotion, product);
    const promotionHtml = product.promotion !== 'none'
        ? `<span class="promotion-badge">${escapeHtml(promotionName)}</span>`
        : '';
    const photoHtml = photo
        ? `<img src="${photo}" class="product-photo-thumbnail" alt="">`
        : '<div class="product-photo-placeholder" aria-hidden="true"></div>';

    container.innerHTML = `
        <div class="product-swipe-bg" aria-hidden="true"></div>
        <div class="product-item" role="button" tabindex="0">
            <div class="product-row">
                ${photoHtml}
                <div class="product-name">${escapeHtml(getProductDisplayName(product.name))}</div>
                <div class="product-meta">
                    <div class="product-promotion">${promotionHtml}</div>
                    <div class="product-quantity">×${product.quantity}</div>
                </div>
                <div class="product-subtotal-value">$${formatAmount(product.subtotal)}</div>
            </div>
        </div>
    `;

    const item = container.querySelector('.product-item');
    attachSwipeToDelete(container, item, product.id);

    return container;
}

/**
 * 綁定左右滑刪除手勢；輕觸／點擊則進入編輯
 */
function attachSwipeToDelete(container, item, productId) {
    const DELETE_THRESHOLD = 100;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isHorizontal = null;
    let suppressClick = false;

    const resetPosition = () => {
        item.style.transition = 'transform 0.25s ease-out';
        item.style.transform = 'translateX(0)';
        container.classList.remove('swiping');
    };

    const commitDelete = (direction) => {
        const offset = direction > 0 ? window.innerWidth : -window.innerWidth;
        item.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        item.style.transform = `translateX(${offset}px)`;
        item.style.opacity = '0';
        container.classList.add('deleting');

        setTimeout(() => {
            deleteProduct(productId, { skipConfirm: true });
        }, 250);
    };

    const openEdit = () => {
        console.log('✏️ 編輯商品:', productId);
        showEditProductModal(productId);
    };

    item.addEventListener('click', () => {
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        openEdit();
    });

    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEdit();
        }
    });

    item.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = 0;
        isSwiping = true;
        isHorizontal = null;
        suppressClick = false;
        item.style.transition = 'none';
        container.classList.add('swiping');
    }, { passive: true });

    item.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (isHorizontal === null) {
            if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
            isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
            if (!isHorizontal) {
                isSwiping = false;
                container.classList.remove('swiping');
                return;
            }
            suppressClick = true;
        }

        if (!isHorizontal) return;

        e.preventDefault();
        currentX = deltaX;
        item.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });

    item.addEventListener('touchend', () => {
        if (!isSwiping || isHorizontal !== true) {
            isSwiping = false;
            isHorizontal = null;
            return;
        }

        isSwiping = false;
        isHorizontal = null;

        if (Math.abs(currentX) >= DELETE_THRESHOLD) {
            commitDelete(currentX);
        } else {
            resetPosition();
        }
    });

    item.addEventListener('touchcancel', () => {
        isSwiping = false;
        isHorizontal = null;
        suppressClick = true;
        resetPosition();
    });
}

/**
 * 更新總金額（加總各商品已儲存的 subtotal，不重新計算）
 */
/** 整數金額，每三位加一撇（例：1234567 → 1,234,567） */
function formatAmount(amount) {
    const value = Number(amount);
    const rounded = Number.isFinite(value) ? Math.round(value) : 0;
    return rounded.toLocaleString('en-US');
}

function updateTotal() {
    const products = productManager.getAllProducts();
    const total = products.reduce((sum, product) => sum + product.subtotal, 0);
    totalAmount.textContent = `$${formatAmount(total)}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Product Edit / Add Functions =====

let currentEditingProductId = null;
let isAddingProduct = false;
let isSavingProduct = false;

/** 金額整數上限（32-bit signed int） */
const AMOUNT_INTEGER_MAX = 2147483647;
const AMOUNT_OVERFLOW_MESSAGE = '金額超過上限，請調整單價或數量';

function setEditSaveButtonEnabled(enabled) {
    document.getElementById('confirmEditBtn').disabled = !enabled || isSavingProduct;
}

function showEditAmountError(message) {
    const errorEl = document.getElementById('editAmountError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function clearEditAmountError() {
    const errorEl = document.getElementById('editAmountError');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
}

function isAmountWithinIntegerMax(amount) {
    return Number.isFinite(amount) && amount <= AMOUNT_INTEGER_MAX;
}

/**
 * 儲存當下檢查單價、自訂小計與計算後小計是否超過整數上限。
 * 通過時一併回傳小計，避免再算一次。
 * @param {{ name: string, price: number, quantity: number, customSubtotal: number|null, promotion: string, bulkQuantity: number|null, bulkPrice: number|null }} values
 * @returns {{ ok: true, subtotal: number } | { ok: false }}
 */
function checkEditAmountLimits(values) {
    const { price, customSubtotal, promotion } = values;

    if (promotion !== 'bulk_discount' && promotion !== 'custom_subtotal'
        && !isAmountWithinIntegerMax(price)) {
        showEditAmountError(AMOUNT_OVERFLOW_MESSAGE);
        return { ok: false };
    }

    if (promotion === 'custom_subtotal' && !isAmountWithinIntegerMax(customSubtotal)) {
        showEditAmountError(AMOUNT_OVERFLOW_MESSAGE);
        return { ok: false };
    }

    const subtotal = computeSubtotalFromValues(values);
    if (!isAmountWithinIntegerMax(subtotal)) {
        showEditAmountError(AMOUNT_OVERFLOW_MESSAGE);
        return { ok: false };
    }

    clearEditAmountError();
    return { ok: true, subtotal };
}

function resetEditProductForm() {
    document.getElementById('editProductName').value = '';
    document.getElementById('editProductPrice').value = '';
    document.getElementById('editProductQuantity').value = 1;
    document.getElementById('editPromotionType').value = 'none';
    document.getElementById('editCustomSubtotal').value = '';
    document.getElementById('editBulkQuantity').value = '';
    document.getElementById('editBulkPrice').value = '';
    setEditPromotionFields('none');
    clearEditFormFieldErrors();
    clearEditAmountError();
    setEditSaveButtonEnabled(true);
}

function setEditPhotoPreview(photo) {
    const preview = document.getElementById('editPhotoPreview');
    if (photo) {
        preview.src = photo;
        preview.style.display = 'block';
    } else {
        preview.removeAttribute('src');
        preview.style.display = 'none';
    }
}

function closeEditProductModal() {
    if (isSavingProduct) return;
    hideModal(editProductModal);
    currentEditingProductId = null;
    isAddingProduct = false;
    currentPhoto = null;
}

/**
 * 拍照後開啟「編輯商品」視窗（新增模式）
 */
function showAddProductModal(photoBase64) {
    isAddingProduct = true;
    currentEditingProductId = null;
    currentPhoto = photoBase64;

    resetEditProductForm();
    setEditPhotoPreview(photoBase64);

    document.getElementById('editModalTitle').textContent = '編輯商品';
    document.getElementById('confirmEditBtn').textContent = '確認加入';

    showModal(editProductModal);
    document.getElementById('editProductPrice').focus();
    console.log('📝 開啟新增商品視窗');
}

/**
 * 顯示編輯商品彈窗（既有商品）
 */
function showEditProductModal(productId) {
    const product = productManager.getProductById(productId);

    if (!product) {
        console.error('❌ 找不到商品:', productId);
        showToast('找不到商品', 'error');
        return;
    }

    isAddingProduct = false;
    currentEditingProductId = productId;
    currentPhoto = null;

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
    clearEditFormFieldErrors();
    updateQuantityMultipleFeedback('editProductQuantity', 'editQuantityError', 'editPromotionType', 'editBulkQuantity');
    setEditPhotoPreview(product.photo || null);
    clearEditAmountError();
    setEditSaveButtonEnabled(true);

    document.getElementById('editModalTitle').textContent = '編輯商品';
    document.getElementById('confirmEditBtn').textContent = '儲存變更';

    showModal(editProductModal);
    console.log('📝 開啟編輯視窗:', product.name);
}

function readEditFormValues() {
    const name = document.getElementById('editProductName').value.trim();
    const promotion = document.getElementById('editPromotionType').value;
    const quantityRaw = document.getElementById('editProductQuantity').value.trim();
    // 數量空白視為 1，最少只填單價即可完成新增
    const quantity = quantityRaw === '' ? 1 : readPositiveInteger(quantityRaw);
    const customSubtotalInput = document.getElementById('editCustomSubtotal').value.trim();
    const customSubtotal = promotion === 'custom_subtotal' && customSubtotalInput !== ''
        ? readPositiveInteger(customSubtotalInput)
        : null;

    let price, bulkQuantity, bulkPrice;

    if (promotion === 'bulk_discount') {
        bulkQuantity = readPositiveInteger(document.getElementById('editBulkQuantity').value);
        bulkPrice = readPositiveInteger(document.getElementById('editBulkPrice').value);
        price = 0;
    } else if (promotion === 'custom_subtotal') {
        price = 0;
        bulkQuantity = null;
        bulkPrice = null;
    } else {
        price = readPositiveInteger(document.getElementById('editProductPrice').value);
        bulkQuantity = null;
        bulkPrice = null;
    }

    return { name, price, quantity, promotion, bulkQuantity, bulkPrice, customSubtotal };
}

/** 依表單值計算並回傳應寫入商品的 subtotal */
function computeSubtotalFromValues(values) {
    return priceCalculator.calculateSubtotal({
        name: values.name,
        price: values.price,
        quantity: values.quantity,
        promotion: values.promotion,
        bulkQuantity: values.bulkQuantity,
        bulkPrice: values.bulkPrice,
        customSubtotal: values.customSubtotal
    });
}

/**
 * 儲存編輯／新增商品
 */
async function saveEditedProduct() {
    if (isSavingProduct) return;

    const values = readEditFormValues();

    if (!validateEditForm(
        values.price,
        values.quantity,
        values.customSubtotal,
        values.promotion,
        values.bulkQuantity,
        values.bulkPrice
    )) {
        return;
    }

    const amountCheck = checkEditAmountLimits(values);
    if (!amountCheck.ok) {
        return;
    }

    if (isAddingProduct) {
        let photo = null;
        if (currentPhoto) {
            isSavingProduct = true;
            setEditSaveButtonEnabled(false);
            try {
                photo = await createStoredThumbnail(currentPhoto);
            } catch (error) {
                console.error('縮圖失敗:', error);
                showToast('照片無法儲存，商品仍會加入', 'warning');
            } finally {
                isSavingProduct = false;
                setEditSaveButtonEnabled(true);
            }
        }

        const product = {
            name: values.name,
            price: values.price,
            quantity: values.quantity,
            promotion: values.promotion,
            bulkQuantity: values.bulkQuantity,
            bulkPrice: values.bulkPrice,
            customSubtotal: values.customSubtotal,
            subtotal: amountCheck.subtotal,
            photo: photo
        };

        const addResult = productManager.addProduct(product);
        console.log('✅ 商品已加入購物清單', addResult.product.serial);

        closeEditProductModal();
        renderShoppingList();

        const count = productManager.getProductCount();
        if (count >= LIST_SIZE_WARNING) {
            showToast(`購物清單已有 ${count} 筆，仍可繼續加入`, 'warning');
        } else {
            showToast('商品已加入購物清單！', 'success');
        }
        return;
    }

    if (!currentEditingProductId) {
        console.error('❌ 沒有正在編輯的商品');
        return;
    }

    const success = productManager.updateProduct(currentEditingProductId, {
        name: values.name,
        price: values.price,
        quantity: values.quantity,
        promotion: values.promotion,
        bulkQuantity: values.bulkQuantity,
        bulkPrice: values.bulkPrice,
        customSubtotal: values.customSubtotal,
        subtotal: amountCheck.subtotal
    });

    if (success) {
        renderShoppingList();
        closeEditProductModal();
        showToast('商品已更新', 'success');
        console.log('✅ 商品已更新');
    } else {
        showToast('更新失敗', 'error');
    }
}

/**
 * 驗證編輯表單（錯誤訊息顯示於對應欄位下方）
 */
function validateEditForm(price, quantity, customSubtotal, promotion, bulkQuantity, bulkPrice) {
    clearEditFormFieldErrors();

    // 品名選填；數量空白已在 readEditFormValues 視為 1
    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        const qtyInput = document.getElementById('editProductQuantity');
        showFieldError('editQuantityError', qtyInput, '請輸入大於 0 的數值');
        qtyInput.focus();
        return false;
    }

    if (promotion === 'bulk_discount') {
        // Validate bulk discount fields
        if (isNaN(bulkQuantity) || bulkQuantity <= 0 || !Number.isInteger(bulkQuantity)) {
            const bulkQtyInput = document.getElementById('editBulkQuantity');
            showFieldError('editBulkQuantityError', bulkQtyInput, '請輸入大於 0 的數值');
            bulkQtyInput.focus();
            return false;
        }

        if (isNaN(bulkPrice) || bulkPrice <= 0) {
            const bulkPriceInput = document.getElementById('editBulkPrice');
            showFieldError('editBulkPriceError', bulkPriceInput, '請輸入大於 0 的數值');
            bulkPriceInput.focus();
            return false;
        }

        const bulkQtyError = validateBulkQuantity(quantity, bulkQuantity);
        if (bulkQtyError) {
            const qtyInput = document.getElementById('editProductQuantity');
            showFieldError('editQuantityError', qtyInput, bulkQtyError);
            qtyInput.focus();
            return false;
        }
    } else if (promotion === 'custom_subtotal') {
        if (customSubtotal === null || isNaN(customSubtotal) || customSubtotal < 0) {
            const customInput = document.getElementById('editCustomSubtotal');
            showFieldError('editCustomSubtotalError', customInput, '請輸入大於 0 的數值');
            customInput.focus();
            return false;
        }
    } else {
        // Validate price for promotions that use unit price
        if (isNaN(price) || price <= 0) {
            const priceInput = document.getElementById('editProductPrice');
            showFieldError('editPriceError', priceInput, '請輸入大於 0 的數值');
            priceInput.focus();
            return false;
        }
    }

    return true;
}

// ===== Product Delete Functions =====

/**
 * 刪除單個商品
 * @param {string|number} productId
 * @param {{ skipConfirm?: boolean }} [options]
 */
function deleteProduct(productId, options = {}) {
    const product = productManager.getProductById(productId);

    if (!product) {
        console.error('❌ 找不到商品:', productId);
        showToast('找不到商品', 'error');
        return;
    }

    // Confirm deletion（滑動刪除可略過確認）
    if (!options.skipConfirm) {
        const displayName = getProductDisplayName(product.name);
        if (!confirm(`確定要刪除「${displayName}」嗎？`)) {
            console.log('❌ 取消刪除');
            return;
        }
    }

    console.log('🗑️ 刪除商品:', getProductDisplayName(product.name));

    // Delete from product manager
    const success = productManager.deleteProduct(productId);

    if (success) {
        // Update UI
        renderShoppingList();

        // Show success message
        showToast(`已刪除「${getProductDisplayName(product.name)}」`, 'success');
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
    if (!confirm(`確定要清空購物清單嗎？\n（${count} 項商品）`)) {
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
    if (!document.querySelector('.modal.show')) {
        document.body.style.overflow = '';
    }
}

/**
 * 顯示完整商品照片
 */
function showFullImage(src) {
    if (!src) {
        return;
    }
    document.getElementById('fullImageView').src = src;
    showModal(fullImageModal);
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
document.getElementById('closeEditBtn').addEventListener('click', () => {
    closeEditProductModal();
});

document.getElementById('closeFullImageBtn').addEventListener('click', () => {
    hideModal(fullImageModal);
});

document.getElementById('editPhotoPreview').addEventListener('click', () => {
    const preview = document.getElementById('editPhotoPreview');
    if (preview.style.display === 'none' || !preview.src) {
        return;
    }
    showFullImage(preview.src);
});

// Edit modal actions
document.getElementById('cancelEditBtn').addEventListener('click', () => {
    console.log(isAddingProduct ? '❌ 取消加入商品' : '❌ 取消編輯');
    closeEditProductModal();
});

document.getElementById('confirmEditBtn').addEventListener('click', () => {
    console.log(isAddingProduct ? '✅ 確認加入' : '✅ 確認編輯');
    saveEditedProduct();
});

// Close modal when clicking outside
[editProductModal, fullImageModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (modal === editProductModal) {
                closeEditProductModal();
            } else {
                hideModal(modal);
            }
        }
    });
});
