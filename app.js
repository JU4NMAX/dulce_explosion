// ===============================================
// DULCE EXPLOSIÓN v3 - IMÁGENES, LOGO Y COMBOS
// ===============================================

// CONFIGURACIÓN DE WHATSAPP
const WHATSAPP_NUMBER = "573222005193";

// ===============================================
// INICIALIZACIÓN DE FIREBASE
// ===============================================

const firebaseConfig = {
  apiKey: "AIzaSyCQ6JW8Hnwxzho54J40UxNy1D76Y3p3vrI",
  authDomain: "dulce-explosion.firebaseapp.com",
  databaseURL: "https://dulce-explosion-default-rtdb.firebaseio.com",
  projectId: "dulce-explosion",
  storageBucket: "dulce-explosion.firebasestorage.app",
  messagingSenderId: "876850704117",
  appId: "1:876850704117:web:3f169faa2585118faf5fbc"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===============================================
// ESTADO GLOBAL
// ===============================================

let state = {
    products: [],
    combos: [],
    categories: ["Dulces", "Snacks"],
    cart: [],
    currentFilter: "todos",
    isAdmin: false,
    adminUnlocked: false,
    adminPassword: "1234",
    openTime: "08:00",
    closeTime: "20:00"
};

// Placeholder cuando un producto no tiene imagen aún
const PLACEHOLDER_IMG = "https://via.placeholder.com/300x300/F3A0C3/FFFFFF?text=Dulce+Explosion";

// ===============================================
// FUNCIONES UTILITARIAS
// ===============================================

function formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    }).format(price);
}

function getIsOpen() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;
    return currentTime >= state.openTime && currentTime < state.closeTime;
}

function updateStatusIndicator() {
    const isOpen = getIsOpen();
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    const closedScreen = document.getElementById("closedScreen");
    const mainContent = document.getElementById("mainContent");
    const openTimeDisplay = document.getElementById("openTimeDisplay");

    if (dot && text) {
        if (isOpen) {
            dot.className = "status-dot open";
            text.textContent = "Abierto";
        } else {
            dot.className = "status-dot closed";
            text.textContent = "Cerrado";
        }
    }

    if (closedScreen && mainContent) {
        const showStore = isOpen || state.adminUnlocked;
        closedScreen.style.display = showStore ? "none" : "flex";
        mainContent.style.display = showStore ? "block" : "none";
        if (!isOpen && openTimeDisplay) openTimeDisplay.textContent = state.openTime;
    }
}

function showNotification(message, type = "success") {
    console.log(`[${type}] ${message}`);
    if (type === "error") alert(message);
}

function getImageOrPlaceholder(imageUrl) {
    return imageUrl && imageUrl.trim() !== "" ? toRawUrl(imageUrl) : PLACEHOLDER_IMG;
}

function toRawUrl(url) {
    if (!url) return url;
    // Convertir URL normal de GitHub a raw automáticamente
    // De: https://github.com/USER/REPO/blob/HASH/images/foto.jpg
    // A:  https://raw.githubusercontent.com/USER/REPO/HASH/images/foto.jpg
    if (url.includes("github.com") && url.includes("/blob/")) {
        return url
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
    }
    return url;
}

function calcAndShowChange(inputId, rowId, amtId) {
    const el = document.getElementById(inputId);
    const rowEl = document.getElementById(rowId);
    const amtEl = document.getElementById(amtId);
    if (!el || !rowEl || !amtEl) return;

    const paid = parseFloat(el.value) || 0;
    const total = calculateTotal();

    if (paid > 0 && total > 0) {
        const change = paid - total;
        rowEl.style.display = "flex";
        amtEl.textContent = formatPrice(Math.abs(change));
        if (change >= 0) {
            amtEl.className = "change-amount";
            rowEl.querySelector("span").textContent = "Tu devuelta:";
        } else {
            amtEl.className = "change-amount change-negative";
            rowEl.querySelector("span").textContent = "Te faltan:";
        }
    } else {
        rowEl.style.display = "none";
    }
}

function getPaymentInfo() {
    const desktop = parseFloat(document.getElementById("paymentAmount")?.value) || 0;
    const mobile = parseFloat(document.getElementById("paymentAmountModal")?.value) || 0;
    return desktop || mobile;
}

// ===============================================
// CARGA DE DATOS DESDE FIREBASE
// ===============================================

function loadDataFromFirebase() {
    db.ref("products").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.products = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            state.products = [];
        }
        renderProducts();
        renderCombos();
        updateCartUI();
    });

    db.ref("combos").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.combos = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            state.combos = [];
        }
        renderCombos();
    });

    db.ref("categories").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.categories = Object.values(data);
        } else {
            state.categories = ["Dulces", "Snacks"];
        }
        renderCategoryFilters();
        updateAdminCategorySelect();
    });

    db.ref("config").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.openTime = data.openTime || "08:00";
            state.closeTime = data.closeTime || "20:00";
            state.adminPassword = data.adminPassword || "1234";
            updateStatusIndicator();
        }
    });

    const spinner = document.getElementById("loadingSpinner");
    const spinnerPromo = document.getElementById("loadingSpinnerPromo");
    if (spinner) spinner.style.display = "none";
    if (spinnerPromo) spinnerPromo.style.display = "none";
}

// ===============================================
// RENDERIZADO DE PRODUCTOS
// ===============================================

function renderCategoryFilters() {
    const container = document.getElementById("categoryFilters");
    if (!container) return;

    let html = `<button class="category-filter active" data-category="todos">Todos</button>`;

    state.categories.forEach(cat => {
        html += `<button class="category-filter" data-category="${cat.toLowerCase()}">${cat}</button>`;
    });

    container.innerHTML = html;

    document.querySelectorAll(".category-filter").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".category-filter").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentFilter = btn.dataset.category;
            renderProducts();
        });
    });
}

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    let normalProducts = state.products;
    if (state.currentFilter !== "todos") {
        normalProducts = normalProducts.filter(p =>
            p.category.toLowerCase() === state.currentFilter
        );
    }

    grid.innerHTML = normalProducts.length > 0
        ? normalProducts.map(product => createProductCard(product)).join("")
        : '<p class="empty-message">Sin productos disponibles</p>';

    attachProductListeners();
}

function renderCombos() {
    const promoGrid = document.getElementById("promotionsGrid");
    if (!promoGrid) return;

    promoGrid.innerHTML = state.combos.length > 0
        ? state.combos.map(combo => createComboCard(combo)).join("")
        : '<p class="empty-message">Sin promociones disponibles</p>';

    attachComboListeners();
}

function createProductCard(product) {
    const isLowStock = product.stock <= 3 && product.stock > 0;
    const isOutOfStock = product.stock === 0;
    const cartItem = state.cart.find(i => i.id === product.id && i.type === "product");
    const imageUrl = getImageOrPlaceholder(product.image);

    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrap">
                <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${isLowStock ? '<div class="stock-alert">⚠️ Últimas unidades</div>' : ''}
                <p class="product-stock">
                    ${isOutOfStock
                        ? '<span style="color: #ff6b6b; font-weight: 700;">Agotado</span>'
                        : `Cantidad: ${product.stock}`}
                </p>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <input type="number" class="quantity-input" value="${cartItem?.quantity || 1}" min="1" max="${product.stock}" data-product-id="${product.id}">
                    <button class="add-to-cart-btn" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                        🛒
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createComboCard(combo) {
    const product1 = state.products.find(p => p.id === combo.productId1);
    const product2 = state.products.find(p => p.id === combo.productId2);
    const maxAvailable = Math.min(
        product1 ? product1.stock : 0,
        product2 ? product2.stock : 0
    );
    const isOutOfStock = maxAvailable === 0;
    const imageUrl = getImageOrPlaceholder(combo.image);

    return `
        <div class="product-card combo-card" data-combo-id="${combo.id}">
            <div class="promotion-badge">⭐ PROMO</div>
            <div class="product-image-wrap">
                <img src="${imageUrl}" alt="${combo.name}" class="product-image" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-name">${combo.name}</h3>
                <p class="combo-includes">
                    ${product1 ? product1.name : "Producto eliminado"} + ${product2 ? product2.name : "Producto eliminado"}
                </p>
                <p class="product-stock">
                    ${isOutOfStock
                        ? '<span style="color: #ff6b6b; font-weight: 700;">Agotado</span>'
                        : `Cantidad disponible: ${maxAvailable}`}
                </p>
                <div class="product-price">${formatPrice(combo.price)}</div>
                <div class="product-actions">
                    <input type="number" class="quantity-input combo-quantity-input" value="1" min="1" max="${maxAvailable}" data-combo-id="${combo.id}">
                    <button class="add-to-cart-btn add-combo-btn" data-combo-id="${combo.id}" ${isOutOfStock ? 'disabled' : ''}>
                        🛒
                    </button>
                </div>
            </div>
        </div>
    `;
}

function attachProductListeners() {
    document.querySelectorAll(".add-to-cart-btn:not(.add-combo-btn)").forEach(btn => {
        btn.addEventListener("click", () => {
            const productId = btn.dataset.productId;
            const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            const quantity = parseInt(qtyInput.value) || 1;
            addToCart(productId, quantity);
        });
    });

    document.querySelectorAll(".quantity-input:not(.combo-quantity-input)").forEach(input => {
        input.addEventListener("change", function() {
            const product = state.products.find(p => p.id === this.dataset.productId);
            if (!product) return;
            if (parseInt(this.value) > product.stock) this.value = product.stock;
            if (parseInt(this.value) < 1) this.value = 1;
        });
    });
}

function attachComboListeners() {
    document.querySelectorAll(".add-combo-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const comboId = btn.dataset.comboId;
            const qtyInput = document.querySelector(`.combo-quantity-input[data-combo-id="${comboId}"]`);
            const quantity = parseInt(qtyInput.value) || 1;
            addComboToCart(comboId, quantity);
        });
    });

    document.querySelectorAll(".combo-quantity-input").forEach(input => {
        input.addEventListener("change", function() {
            const max = parseInt(this.max) || 1;
            if (parseInt(this.value) > max) this.value = max;
            if (parseInt(this.value) < 1) this.value = 1;
        });
    });
}

// ===============================================
// CARRITO
// ===============================================

function addToCart(productId, quantity = 1) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock < quantity) {
        alert("No hay suficiente cantidad disponible");
        return;
    }

    const existingItem = state.cart.find(i => i.id === productId && i.type === "product");

    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            alert("No hay suficiente cantidad disponible");
            return;
        }
        existingItem.quantity += quantity;
    } else {
        state.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: product.image,
            type: "product"
        });
    }

    updateCartUI();
    showNotification("Producto agregado al carrito", "success");
}

function addComboToCart(comboId, quantity = 1) {
    const combo = state.combos.find(c => c.id === comboId);
    if (!combo) return;

    const product1 = state.products.find(p => p.id === combo.productId1);
    const product2 = state.products.find(p => p.id === combo.productId2);
    const maxAvailable = Math.min(
        product1 ? product1.stock : 0,
        product2 ? product2.stock : 0
    );

    if (maxAvailable < quantity) {
        alert("No hay suficiente cantidad disponible para esta promoción");
        return;
    }

    const existingItem = state.cart.find(i => i.id === comboId && i.type === "combo");

    if (existingItem) {
        if (existingItem.quantity + quantity > maxAvailable) {
            alert("No hay suficiente cantidad disponible para esta promoción");
            return;
        }
        existingItem.quantity += quantity;
    } else {
        state.cart.push({
            id: comboId,
            name: combo.name,
            price: combo.price,
            quantity: quantity,
            image: combo.image,
            type: "combo"
        });
    }

    updateCartUI();
    showNotification("Promoción agregada al carrito", "success");
}

function removeFromCart(productId, type) {
    state.cart = state.cart.filter(i => !(i.id === productId && i.type === type));
    updateCartUI();
}

function updateCartQuantity(productId, type, quantity) {
    const item = state.cart.find(i => i.id === productId && i.type === type);
    if (!item) return;

    let maxAllowed = Infinity;

    if (type === "combo") {
        const combo = state.combos.find(c => c.id === productId);
        if (combo) {
            const product1 = state.products.find(p => p.id === combo.productId1);
            const product2 = state.products.find(p => p.id === combo.productId2);
            maxAllowed = Math.min(product1 ? product1.stock : 0, product2 ? product2.stock : 0);
        }
    } else {
        const product = state.products.find(p => p.id === productId);
        maxAllowed = product ? product.stock : 0;
    }

    if (quantity > maxAllowed) {
        alert("No hay suficiente cantidad disponible");
        return;
    }
    if (quantity <= 0) {
        removeFromCart(productId, type);
    } else {
        item.quantity = quantity;
        updateCartUI();
    }
}

function calculateTotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartUI() {
    const cartItems = document.getElementById("cartItems");
    const modalItems = document.getElementById("modalItems");
    const cartCount = document.getElementById("cartCount");
    const total = calculateTotal();

    if (cartCount) cartCount.textContent = state.cart.length;

    if (state.cart.length === 0) {
        const emptyHtml = '<p class="empty-message">Tu carrito está vacío</p>';
        if (cartItems) cartItems.innerHTML = emptyHtml;
        if (modalItems) modalItems.innerHTML = emptyHtml;
        if (document.getElementById("total")) document.getElementById("total").textContent = "$0";
        if (document.getElementById("modalTotal")) document.getElementById("modalTotal").textContent = "$0";
        return;
    }

    const cartHtml = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">${item.name}${item.type === "combo" ? " (Promoción)" : ""}</div>
            <div class="cart-item-price">${formatPrice(item.price)} c/u</div>
            <div class="cart-item-controls">
                <div class="cart-qty-wrap">
                    <button class="cart-qty-btn cart-qty-minus" data-product-id="${item.id}" data-type="${item.type}">−</button>
                    <input type="number" class="cart-item-qty" value="${item.quantity}" min="1" data-product-id="${item.id}" data-type="${item.type}">
                    <button class="cart-qty-btn cart-qty-plus" data-product-id="${item.id}" data-type="${item.type}">+</button>
                </div>
                <span class="cart-item-subtotal">= ${formatPrice(item.price * item.quantity)}</span>
                <button class="cart-item-remove" data-product-id="${item.id}" data-type="${item.type}">✕</button>
            </div>
        </div>
    `).join("");

    if (cartItems) cartItems.innerHTML = cartHtml;
    if (modalItems) modalItems.innerHTML = cartHtml;
    if (document.getElementById("total")) document.getElementById("total").textContent = formatPrice(total);
    if (document.getElementById("modalTotal")) document.getElementById("modalTotal").textContent = formatPrice(total);

    document.querySelectorAll(".cart-item-qty").forEach(input => {
        input.addEventListener("change", function() {
            updateCartQuantity(this.dataset.productId, this.dataset.type, parseInt(this.value));
        });
    });

    document.querySelectorAll(".cart-qty-minus").forEach(btn => {
        btn.addEventListener("click", () => {
            const item = state.cart.find(i => i.id === btn.dataset.productId && i.type === btn.dataset.type);
            if (item) updateCartQuantity(btn.dataset.productId, btn.dataset.type, item.quantity - 1);
        });
    });

    document.querySelectorAll(".cart-qty-plus").forEach(btn => {
        btn.addEventListener("click", () => {
            const item = state.cart.find(i => i.id === btn.dataset.productId && i.type === btn.dataset.type);
            if (item) updateCartQuantity(btn.dataset.productId, btn.dataset.type, item.quantity + 1);
        });
    });

    document.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            removeFromCart(btn.dataset.productId, btn.dataset.type);
        });
    });
}

function clearCart() {
    if (state.cart.length === 0) {
        alert("El carrito ya está vacío");
        return;
    }
    if (confirm("¿Vaciar el carrito?")) {
        state.cart = [];
        updateCartUI();
    }
}

// ===============================================
// CHECKOUT (WhatsApp)
// ===============================================

function checkout() {
    if (state.cart.length === 0) {
        alert("Tu carrito está vacío");
        return;
    }

    const total = calculateTotal();
    const paid = getPaymentInfo();
    let message = "¡Hola! Me gustaría comprar los siguientes productos:\n\n";

    state.cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}${item.type === "combo" ? " (Promoción)" : ""}\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio unitario: ${formatPrice(item.price)}\n`;
        message += `   Subtotal: ${formatPrice(item.price * item.quantity)}\n\n`;
    });

    message += `--- TOTAL A PAGAR: ${formatPrice(total)} ---\n`;

    if (paid > 0) {
        const change = paid - total;
        message += `Pago con: ${formatPrice(paid)}\n`;
        if (change >= 0) {
            message += `Devuelta: ${formatPrice(change)}\n`;
        } else {
            message += `(Me faltan: ${formatPrice(Math.abs(change))})\n`;
        }
    }

    message += "\n¡Gracias por comprar en Dulce Explosión! 🍭";

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");

    setTimeout(() => {
        state.cart = [];
        updateCartUI();
    }, 1000);
}

// ===============================================
// INTERFAZ DE CARRITO (Mobile/Desktop)
// ===============================================

function toggleCartSidebar() {
    const sidebar = document.getElementById("cartSidebar");
    const modal = document.getElementById("cartModal");

    if (sidebar) sidebar.classList.toggle("active");
    if (modal) modal.classList.toggle("active");
    if (document.getElementById("overlay")) document.getElementById("overlay").classList.toggle("active");
}

// ===============================================
// PANEL DE ADMINISTRACIÓN
// ===============================================

function showAdminPanel() {
    document.getElementById("authModal").classList.add("active");
    document.getElementById("overlay").classList.add("active");
}

function hideAdminPanel() {
    document.getElementById("adminPanel").classList.remove("active");
    document.getElementById("authModal").classList.remove("active");
    document.getElementById("overlay").classList.remove("active");
}

function verifyAdminPassword() {
    const password = document.getElementById("adminPassword").value;

    db.ref("config/adminPassword").once("value", (snapshot) => {
        const savedPassword = snapshot.val() || "1234";

        if (password === savedPassword) {
            document.getElementById("authModal").classList.remove("active");
            document.getElementById("adminPanel").classList.add("active");
            state.isAdmin = true;
            // Si la tienda está cerrada, desbloquear vista temporalmente
            if (!getIsOpen()) {
                state.adminUnlocked = true;
                updateStatusIndicator();
            }
            renderAdminPanel();
            document.getElementById("adminPassword").value = "";
        } else {
            alert("Contraseña incorrecta");
        }
    });
}

function renderAdminPanel() {
    renderAdminProducts();
    renderAdminCombos();
    renderAdminCategories();
    updateComboProductSelects();
    loadAdminSettings();
}

function renderAdminProducts() {
    const list = document.getElementById("productsAdminList");
    if (!list) return;

    if (state.products.length === 0) {
        list.innerHTML = '<p class="loading-text">Sin productos</p>';
        return;
    }

    list.innerHTML = state.products.map(product => `
        <div class="product-admin-item">
            <img src="${getImageOrPlaceholder(product.image)}" alt="${product.name}" class="product-admin-thumb">
            <div class="product-admin-info">
                <div class="product-admin-name">${product.name}</div>
                <div class="product-admin-price">${formatPrice(product.price)}</div>
                <div class="product-admin-stock">Cantidad: <strong>${product.stock}</strong></div>
            </div>
            <div class="stock-controls">
                <button class="stock-btn minus-btn" data-product-id="${product.id}">−</button>
                <div class="stock-display" id="stock-${product.id}">${product.stock}</div>
                <button class="stock-btn plus-btn" data-product-id="${product.id}">+</button>
                <button class="edit-btn" data-product-id="${product.id}">Editar</button>
                <button class="delete-btn" data-product-id="${product.id}">Eliminar</button>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".plus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            modifyStock(btn.dataset.productId, 1);
        });
    });

    document.querySelectorAll(".minus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            modifyStock(btn.dataset.productId, -1);
        });
    });

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditProductModal(btn.dataset.productId);
        });
    });

    document.querySelectorAll(".product-admin-item .delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar este producto?")) {
                deleteProduct(btn.dataset.productId);
            }
        });
    });
}

function renderAdminCombos() {
    const list = document.getElementById("combosAdminList");
    if (!list) return;

    if (state.combos.length === 0) {
        list.innerHTML = '<p class="loading-text">Sin promociones creadas</p>';
        return;
    }

    list.innerHTML = state.combos.map(combo => {
        const product1 = state.products.find(p => p.id === combo.productId1);
        const product2 = state.products.find(p => p.id === combo.productId2);
        return `
            <div class="product-admin-item">
                <img src="${getImageOrPlaceholder(combo.image)}" alt="${combo.name}" class="product-admin-thumb">
                <div class="product-admin-info">
                    <div class="product-admin-name">${combo.name}</div>
                    <div class="product-admin-price">${formatPrice(combo.price)}</div>
                    <div class="product-admin-stock">
                        ${product1 ? product1.name : "Eliminado"} + ${product2 ? product2.name : "Eliminado"}
                    </div>
                </div>
                <div class="stock-controls">
                    <button class="edit-btn" data-combo-id="${combo.id}">Editar</button>
                    <button class="delete-btn" data-combo-id="${combo.id}">Eliminar</button>
                </div>
            </div>
        `;
    }).join("");

    document.querySelectorAll("#combosAdminList .edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditComboModal(btn.dataset.comboId);
        });
    });

    document.querySelectorAll("#combosAdminList .delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar esta promoción?")) {
                deleteCombo(btn.dataset.comboId);
            }
        });
    });
}

function modifyStock(productId, amount) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
        const newStock = Math.max(0, product.stock + amount);
        // Actualizar localmente de inmediato para que se vea en admin al instante
        product.stock = newStock;
        const display = document.getElementById(`stock-${productId}`);
        if (display) display.textContent = newStock;
        // Luego sincronizar con Firebase
        db.ref(`products/${productId}/stock`).set(newStock);
    }
}

function deleteProduct(productId) {
    db.ref(`products/${productId}`).remove();
    state.cart = state.cart.filter(i => !(i.id === productId && i.type === "product"));
}

function addProduct() {
    const form = document.getElementById("addProductForm");
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const price = parseFloat(document.getElementById("productPrice").value);
    const stock = parseInt(document.getElementById("productStock").value);
    const image = document.getElementById("productImage").value.trim();

    if (!name || !category || isNaN(price) || isNaN(stock) || stock < 0) {
        alert("Completa todos los campos correctamente");
        return;
    }

    const newProductRef = db.ref("products").push();
    newProductRef.set({
        name,
        category,
        price,
        stock,
        image: toRawUrl(image),
        createdAt: new Date().toISOString()
    });

    form.reset();
    alert("Producto agregado correctamente");
}

function addCombo() {
    const form = document.getElementById("addComboForm");
    const name = document.getElementById("comboName").value.trim();
    const productId1 = document.getElementById("comboProduct1").value;
    const productId2 = document.getElementById("comboProduct2").value;
    const price = parseFloat(document.getElementById("comboPrice").value);
    const image = document.getElementById("comboImage").value.trim();

    if (!name || !productId1 || !productId2 || isNaN(price)) {
        alert("Completa todos los campos correctamente");
        return;
    }

    const newComboRef = db.ref("combos").push();
    newComboRef.set({
        name,
        productId1,
        productId2,
        price,
        image: toRawUrl(image),
        createdAt: new Date().toISOString()
    });

    form.reset();
    alert("Combo agregado correctamente");
}

function deleteCombo(comboId) {
    db.ref(`combos/${comboId}`).remove();
    state.cart = state.cart.filter(i => !(i.id === comboId && i.type === "combo"));
}

function updateComboProductSelects() {
    const select1 = document.getElementById("comboProduct1");
    const select2 = document.getElementById("comboProduct2");
    if (!select1 || !select2) return;

    const options = '<option value="">Selecciona producto</option>' +
        state.products.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

    select1.innerHTML = options;
    select2.innerHTML = options;
}

function renderAdminCategories() {
    const list = document.getElementById("categoriesList");
    if (!list) return;

    list.innerHTML = state.categories.map((cat, idx) => `
        <div class="category-admin-item">
            <span>${cat}</span>
            <button class="delete-btn" data-index="${idx}">Eliminar</button>
        </div>
    `).join("");

    document.querySelectorAll(".category-admin-item .delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            deleteCategory(idx);
        });
    });
}

function addCategory() {
    const form = document.getElementById("categoryForm");
    const name = document.getElementById("categoryName").value.trim();

    if (!name) {
        alert("Ingresa el nombre de la categoría");
        return;
    }

    if (state.categories.includes(name)) {
        alert("Esta categoría ya existe");
        return;
    }

    const newCategories = [...state.categories, name];
    db.ref("categories").set(newCategories);
    form.reset();
    alert("Categoría agregada");
}

function deleteCategory(idx) {
    if (confirm("¿Eliminar esta categoría?")) {
        const newCategories = state.categories.filter((_, i) => i !== idx);
        db.ref("categories").set(newCategories);
    }
}

function updateAdminCategorySelect() {
    const select = document.getElementById("productCategory");
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona categoría</option>';
    state.categories.forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function loadAdminSettings() {
    document.getElementById("openTime").value = state.openTime;
    document.getElementById("closeTime").value = state.closeTime;
}

function saveTimes() {
    const openTime = document.getElementById("openTime").value;
    const closeTime = document.getElementById("closeTime").value;

    if (openTime >= closeTime) {
        alert("La hora de cierre debe ser después de apertura");
        return;
    }

    db.ref("config").update({
        openTime,
        closeTime
    });

    alert("Horario guardado");
}

function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;

    db.ref("config/adminPassword").once("value", (snapshot) => {
        const savedPassword = snapshot.val() || "1234";

        if (currentPassword !== savedPassword) {
            alert("Contraseña actual incorrecta");
            return;
        }

        if (!newPassword || newPassword.length < 4) {
            alert("La nueva contraseña debe tener al menos 4 caracteres");
            return;
        }

        db.ref("config/adminPassword").set(newPassword);
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        alert("Contraseña cambiada");
    });
}

function resetAllData() {
    if (confirm("⚠️ Esto eliminará TODO. ¿Estás completamente seguro?")) {
        if (confirm("Confirma nuevamente que deseas borrar TODO")) {
            db.ref().remove();
            location.reload();
        }
    }
}

// ===============================================
// EDICIÓN DE PRODUCTOS
// ===============================================

function openEditProductModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById("editProductId").value = productId;
    document.getElementById("editProductName").value = product.name;
    document.getElementById("editProductPrice").value = product.price;
    document.getElementById("editProductStock").value = product.stock;
    document.getElementById("editProductImage").value = product.image || "";

    // Poblar select de categorías
    const select = document.getElementById("editProductCategory");
    select.innerHTML = '<option value="">Selecciona categoría</option>';
    state.categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        if (cat === product.category) option.selected = true;
        select.appendChild(option);
    });

    document.getElementById("editProductModal").classList.add("active");
}

function closeEditProductModal() {
    document.getElementById("editProductModal").classList.remove("active");
}

function saveEditProduct() {
    const productId = document.getElementById("editProductId").value;
    const name = document.getElementById("editProductName").value.trim();
    const category = document.getElementById("editProductCategory").value;
    const price = parseFloat(document.getElementById("editProductPrice").value);
    const stock = parseInt(document.getElementById("editProductStock").value);
    const image = document.getElementById("editProductImage").value.trim();

    if (!name || !category || isNaN(price) || isNaN(stock) || stock < 0) {
        alert("Completa todos los campos correctamente");
        return;
    }

    db.ref(`products/${productId}`).update({
        name,
        category,
        price,
        stock,
        image: toRawUrl(image)
    }).then(() => {
        alert("Producto actualizado correctamente");
        closeEditProductModal();
    }).catch(() => {
        alert("Error al guardar los cambios");
    });
}

function openEditComboModal(comboId) {
    const combo = state.combos.find(c => c.id === comboId);
    if (!combo) return;

    document.getElementById("editComboId").value = comboId;
    document.getElementById("editComboName").value = combo.name;
    document.getElementById("editComboPrice").value = combo.price;
    document.getElementById("editComboImage").value = combo.image || "";

    const options = '<option value="">Selecciona producto</option>' +
        state.products.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    document.getElementById("editComboProduct1").innerHTML = options;
    document.getElementById("editComboProduct2").innerHTML = options;
    document.getElementById("editComboProduct1").value = combo.productId1;
    document.getElementById("editComboProduct2").value = combo.productId2;

    document.getElementById("editComboModal").classList.add("active");
}

function closeEditComboModal() {
    document.getElementById("editComboModal").classList.remove("active");
}

function saveEditCombo() {
    const comboId = document.getElementById("editComboId").value;
    const name = document.getElementById("editComboName").value.trim();
    const productId1 = document.getElementById("editComboProduct1").value;
    const productId2 = document.getElementById("editComboProduct2").value;
    const price = parseFloat(document.getElementById("editComboPrice").value);
    const image = document.getElementById("editComboImage").value.trim();

    if (!name || !productId1 || !productId2 || isNaN(price)) {
        alert("Completa todos los campos correctamente");
        return;
    }

    db.ref(`combos/${comboId}`).update({
        name,
        productId1,
        productId2,
        price,
        image: toRawUrl(image)
    }).then(() => {
        alert("Promoción actualizada correctamente");
        closeEditComboModal();
    }).catch(() => {
        alert("Error al guardar los cambios");
    });
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    loadDataFromFirebase();
    updateStatusIndicator();

    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".products-section, .promotions-section").forEach(s => s.style.display = "none");

            btn.classList.add("active");
            const tab = btn.dataset.tab;
            document.getElementById(`${tab}Tab`).style.display = "block";
        });
    });

    if (document.getElementById("cartButton")) document.getElementById("cartButton").addEventListener("click", toggleCartSidebar);
    if (document.getElementById("closeCart")) document.getElementById("closeCart").addEventListener("click", toggleCartSidebar);
    if (document.getElementById("modalClose")) document.getElementById("modalClose").addEventListener("click", toggleCartSidebar);
    if (document.getElementById("overlay")) document.getElementById("overlay").addEventListener("click", toggleCartSidebar);

    if (document.getElementById("checkoutBtn")) document.getElementById("checkoutBtn").addEventListener("click", checkout);
    if (document.getElementById("checkoutBtnModal")) document.getElementById("checkoutBtnModal").addEventListener("click", checkout);
    if (document.getElementById("clearCartBtn")) document.getElementById("clearCartBtn").addEventListener("click", clearCart);
    if (document.getElementById("clearCartBtnModal")) document.getElementById("clearCartBtnModal").addEventListener("click", clearCart);

    if (document.getElementById("adminFloatBtn")) document.getElementById("adminFloatBtn").addEventListener("click", showAdminPanel);
    if (document.getElementById("closedAdminBtn")) document.getElementById("closedAdminBtn").addEventListener("click", showAdminPanel);

    // Pago y devuelta
    const payInput = document.getElementById("paymentAmount");
    if (payInput) payInput.addEventListener("input", () => calcAndShowChange("paymentAmount", "changeRow", "changeAmount"));
    const payInputModal = document.getElementById("paymentAmountModal");
    if (payInputModal) payInputModal.addEventListener("input", () => calcAndShowChange("paymentAmountModal", "changeRowModal", "changeAmountModal"));
    if (document.getElementById("adminCloseBtn")) document.getElementById("adminCloseBtn").addEventListener("click", hideAdminPanel);
    if (document.getElementById("authSubmitBtn")) document.getElementById("authSubmitBtn").addEventListener("click", verifyAdminPassword);
    if (document.getElementById("authCancelBtn")) document.getElementById("authCancelBtn").addEventListener("click", hideAdminPanel);

    const adminPassInput = document.getElementById("adminPassword");
    if (adminPassInput) {
        adminPassInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") verifyAdminPassword();
        });
    }

    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".admin-content").forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            document.querySelector(`[data-admin-content="${tab.dataset.adminTab}"]`).classList.add("active");
        });
    });

    if (document.getElementById("addProductForm")) {
        document.getElementById("addProductForm").addEventListener("submit", (e) => {
            e.preventDefault();
            addProduct();
        });
    }

    if (document.getElementById("addComboForm")) {
        document.getElementById("addComboForm").addEventListener("submit", (e) => {
            e.preventDefault();
            addCombo();
        });
    }

    if (document.getElementById("categoryForm")) {
        document.getElementById("categoryForm").addEventListener("submit", (e) => {
            e.preventDefault();
            addCategory();
        });
    }

    if (document.getElementById("saveEditProductBtn")) document.getElementById("saveEditProductBtn").addEventListener("click", saveEditProduct);
    if (document.getElementById("cancelEditProductBtn")) document.getElementById("cancelEditProductBtn").addEventListener("click", closeEditProductModal);
    if (document.getElementById("saveEditComboBtn")) document.getElementById("saveEditComboBtn").addEventListener("click", saveEditCombo);
    if (document.getElementById("cancelEditComboBtn")) document.getElementById("cancelEditComboBtn").addEventListener("click", closeEditComboModal);

    if (document.getElementById("saveTimesBtn")) document.getElementById("saveTimesBtn").addEventListener("click", saveTimes);
    if (document.getElementById("changePasswordBtn")) document.getElementById("changePasswordBtn").addEventListener("click", changePassword);
    if (document.getElementById("resetDataBtn")) document.getElementById("resetDataBtn").addEventListener("click", resetAllData);

    if (document.getElementById("adminPanel")) {
        document.getElementById("adminPanel").addEventListener("click", (e) => {
            if (e.target.id === "adminPanel") hideAdminPanel();
        });
    }

    if (document.getElementById("authModal")) {
        document.getElementById("authModal").addEventListener("click", (e) => {
            if (e.target.id === "authModal") hideAdminPanel();
        });
    }
});

setInterval(updateStatusIndicator, 60000);
