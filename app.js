// ===============================================
// DULCE EXPLOSIÓN v2 - CON FIREBASE
// ===============================================

// CONFIGURACIÓN DE WHATSAPP
const WHATSAPP_NUMBER = "573222005193";

// ===============================================
// INICIALIZACIÓN DE FIREBASE
// ===============================================

// Reemplaza esto con tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDummy_REEMPLAZA_CON_TU_API_KEY",
    authDomain: "dulce-explosion.firebaseapp.com",
    databaseURL: "https://dulce-explosion-default-rtdb.firebaseio.com",
    projectId: "dulce-explosion",
    storageBucket: "dulce-explosion.appspot.com",
    messagingSenderId: "DUMMY_REEMPLAZA",
    appId: "1:DUMMY_REEMPLAZA:web:DUMMY_REEMPLAZA"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===============================================
// ESTADO GLOBAL
// ===============================================

let state = {
    products: [],
    categories: ["Dulces", "Snacks"],
    cart: [],
    currentFilter: "todos",
    isAdmin: false,
    adminPassword: "1234",
    openTime: "08:00",
    closeTime: "20:00"
};

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
    
    if (isOpen) {
        dot.className = "status-dot open";
        text.textContent = "Abierto";
    } else {
        dot.className = "status-dot closed";
        text.textContent = "Cerrado";
    }
}

function showNotification(message, type = "success") {
    // Notificación simple en consola y alert
    console.log(`[${type}] ${message}`);
    if (type === "error") alert(message);
}

// ===============================================
// CARGA DE DATOS DESDE FIREBASE
// ===============================================

function loadDataFromFirebase() {
    // Cargar productos
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
        updateCartUI();
    });

    // Cargar categorías
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

    // Cargar configuración
    db.ref("config").on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.openTime = data.openTime || "08:00";
            state.closeTime = data.closeTime || "20:00";
            state.adminPassword = data.adminPassword || "1234";
            updateStatusIndicator();
        }
    });

    document.getElementById("loadingSpinner").style.display = "none";
    document.getElementById("loadingSpinnerPromo").style.display = "none";
}

// ===============================================
// RENDERIZADO DE PRODUCTOS
// ===============================================

function renderCategoryFilters() {
    const container = document.getElementById("categoryFilters");
    
    let html = `
        <button class="category-filter active" data-category="todos">
            Todos
        </button>
    `;
    
    state.categories.forEach(cat => {
        html += `
            <button class="category-filter" data-category="${cat.toLowerCase()}">
                ${cat}
            </button>
        `;
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
    const promoGrid = document.getElementById("promotionsGrid");
    
    // Filtrar productos normales
    let normalProducts = state.products.filter(p => !p.isPromotion);
    if (state.currentFilter !== "todos") {
        normalProducts = normalProducts.filter(p => 
            p.category.toLowerCase() === state.currentFilter
        );
    }
    
    // Productos para la sección de Productos
    grid.innerHTML = normalProducts.map(product => createProductCard(product)).join("");
    
    // Productos para la sección de Promociones
    const promos = state.products.filter(p => p.isPromotion);
    promoGrid.innerHTML = promos.length > 0 
        ? promos.map(product => createProductCard(product)).join("")
        : '<p class="empty-message">Sin promociones disponibles</p>';
    
    attachProductListeners();
}

function createProductCard(product) {
    const isLowStock = product.stock <= 3 && product.stock > 0;
    const isOutOfStock = product.stock === 0;
    const cartItem = state.cart.find(i => i.id === product.id);
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            ${product.isPromotion ? '<div class="promotion-badge">⭐ PROMO</div>' : ''}
            <div class="product-emoji">${product.emoji || "🍭"}</div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${isLowStock ? '<div class="stock-alert">⚠️ Últimas unidades</div>' : ''}
                <p class="product-stock">
                    ${isOutOfStock 
                        ? '<span style="color: #ff6b6b; font-weight: 700;">Agotado</span>' 
                        : `Stock: ${product.stock}`}
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

function attachProductListeners() {
    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const productId = btn.dataset.productId;
            const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            const quantity = parseInt(qtyInput.value) || 1;
            addToCart(productId, quantity);
        });
    });

    document.querySelectorAll(".quantity-input").forEach(input => {
        input.addEventListener("change", function() {
            const product = state.products.find(p => p.id === this.dataset.productId);
            if (parseInt(this.value) > product.stock) this.value = product.stock;
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
        alert("No hay suficiente stock");
        return;
    }

    const existingItem = state.cart.find(i => i.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            alert("No hay suficiente stock");
            return;
        }
        existingItem.quantity += quantity;
    } else {
        state.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: quantity,
            emoji: product.emoji,
            isPromotion: product.isPromotion
        });
    }

    updateCartUI();
    showNotification("Producto agregado al carrito", "success");
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    updateCartUI();
}

function updateCartQuantity(productId, quantity) {
    const item = state.cart.find(i => i.id === productId);
    const product = state.products.find(p => p.id === productId);
    
    if (item) {
        if (quantity > product.stock) {
            alert("No hay suficiente stock");
            return;
        }
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            updateCartUI();
        }
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
    
    cartCount.textContent = state.cart.length;

    if (state.cart.length === 0) {
        const emptyHtml = '<p class="empty-message">Tu carrito está vacío</p>';
        cartItems.innerHTML = emptyHtml;
        modalItems.innerHTML = emptyHtml;
        document.getElementById("total").textContent = "$0";
        document.getElementById("modalTotal").textContent = "$0";
        return;
    }

    const cartHtml = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">${item.emoji} ${item.name}</div>
            <div class="cart-item-price">${formatPrice(item.price)} c/u</div>
            <div class="cart-item-controls">
                <input type="number" class="cart-item-qty" value="${item.quantity}" min="1" data-product-id="${item.id}">
                <span style="color: #999;">= ${formatPrice(item.price * item.quantity)}</span>
                <button class="cart-item-remove" data-product-id="${item.id}">✕</button>
            </div>
        </div>
    `).join("");

    cartItems.innerHTML = cartHtml;
    modalItems.innerHTML = cartHtml;
    document.getElementById("total").textContent = formatPrice(total);
    document.getElementById("modalTotal").textContent = formatPrice(total);

    // Event listeners
    document.querySelectorAll(".cart-item-qty").forEach(input => {
        input.addEventListener("change", function() {
            updateCartQuantity(this.dataset.productId, parseInt(this.value));
        });
    });

    document.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            removeFromCart(btn.dataset.productId);
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
    let message = "¡Hola! Me gustaría comprar:\n\n";
    
    state.cart.forEach(item => {
        message += `${item.emoji} ${item.name}\n`;
        message += `   • Cantidad: ${item.quantity}\n`;
        message += `   • Precio unitario: ${formatPrice(item.price)}\n`;
        message += `   • Subtotal: ${formatPrice(item.price * item.quantity)}\n\n`;
    });

    message += `💰 TOTAL: ${formatPrice(total)}\n\n`;
    message += "¡Gracias por comprar en Dulce Explosión! 🍭";

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");

    // Limpiar carrito después de compra
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
    
    sidebar.classList.toggle("active");
    modal.classList.toggle("active");
    document.getElementById("overlay").classList.toggle("active");
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
            renderAdminPanel();
            document.getElementById("adminPassword").value = "";
        } else {
            alert("Contraseña incorrecta");
        }
    });
}

function renderAdminPanel() {
    renderAdminProducts();
    renderAdminCategories();
    loadAdminSettings();
}

function renderAdminProducts() {
    const list = document.getElementById("productsAdminList");
    
    if (state.products.length === 0) {
        list.innerHTML = '<p class="loading-text">Sin productos</p>';
        return;
    }
    
    list.innerHTML = state.products.map(product => `
        <div class="product-admin-item">
            <div class="product-admin-info">
                <div class="product-admin-name">${product.emoji} ${product.name}</div>
                <div class="product-admin-price">${formatPrice(product.price)}</div>
                <div class="product-admin-stock">Stock: <strong>${product.stock}</strong></div>
            </div>
            <div class="stock-controls">
                <button class="stock-btn minus-btn" data-product-id="${product.id}">−</button>
                <div class="stock-display" id="stock-${product.id}">${product.stock}</div>
                <button class="stock-btn plus-btn" data-product-id="${product.id}">+</button>
                <button class="delete-btn" data-product-id="${product.id}">Eliminar</button>
            </div>
        </div>
    `).join("");

    // Event listeners
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

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar este producto?")) {
                deleteProduct(btn.dataset.productId);
            }
        });
    });
}

function modifyStock(productId, amount) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
        const newStock = Math.max(0, product.stock + amount);
        db.ref(`products/${productId}/stock`).set(newStock);
    }
}

function deleteProduct(productId) {
    db.ref(`products/${productId}`).remove();
    state.cart = state.cart.filter(i => i.id !== productId);
}

function addProduct() {
    const form = document.getElementById("addProductForm");
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const price = parseFloat(document.getElementById("productPrice").value);
    const stock = parseInt(document.getElementById("productStock").value);
    const emoji = document.getElementById("productEmoji").value.trim() || "🍭";
    const isPromotion = document.getElementById("isPromotion").checked;

    if (!name || !category || !price || stock < 0) {
        alert("Completa todos los campos correctamente");
        return;
    }

    const newProductRef = db.ref("products").push();
    newProductRef.set({
        name,
        category,
        price,
        stock,
        emoji,
        isPromotion,
        createdAt: new Date().toISOString()
    });

    form.reset();
    alert("Producto agregado correctamente");
}

function renderAdminCategories() {
    const list = document.getElementById("categoriesList");
    
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
// INICIALIZACIÓN
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // Cargar datos desde Firebase
    loadDataFromFirebase();
    updateStatusIndicator();

    // Eventos de pestañas
    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".products-section, .promotions-section").forEach(s => s.style.display = "none");
            
            btn.classList.add("active");
            const tab = btn.dataset.tab;
            document.getElementById(`${tab}Tab`).style.display = "block";
        });
    });

    // Carrito
    document.getElementById("cartButton").addEventListener("click", toggleCartSidebar);
    document.getElementById("closeCart").addEventListener("click", toggleCartSidebar);
    document.getElementById("modalClose").addEventListener("click", toggleCartSidebar);
    document.getElementById("overlay").addEventListener("click", toggleCartSidebar);

    document.getElementById("checkoutBtn").addEventListener("click", checkout);
    document.getElementById("checkoutBtnModal").addEventListener("click", checkout);
    document.getElementById("clearCartBtn").addEventListener("click", clearCart);
    document.getElementById("clearCartBtnModal").addEventListener("click", clearCart);

    // Admin
    document.getElementById("adminFloatBtn").addEventListener("click", showAdminPanel);
    document.getElementById("adminCloseBtn").addEventListener("click", hideAdminPanel);
    document.getElementById("authSubmitBtn").addEventListener("click", verifyAdminPassword);
    document.getElementById("authCancelBtn").addEventListener("click", hideAdminPanel);

    document.getElementById("adminPassword").addEventListener("keypress", (e) => {
        if (e.key === "Enter") verifyAdminPassword();
    });

    // Admin tabs
    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".admin-content").forEach(c => c.classList.remove("active"));
            
            tab.classList.add("active");
            document.querySelector(`[data-admin-content="${tab.dataset.adminTab}"]`).classList.add("active");
        });
    });

    // Admin forms
    document.getElementById("addProductForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addProduct();
    });

    document.getElementById("categoryForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addCategory();
    });

    document.getElementById("saveTimesBtn").addEventListener("click", saveTimes);
    document.getElementById("changePasswordBtn").addEventListener("click", changePassword);
    document.getElementById("resetDataBtn").addEventListener("click", resetAllData);

    // Cerrar admin modal al hacer click fuera
    document.getElementById("adminPanel").addEventListener("click", (e) => {
        if (e.target.id === "adminPanel") hideAdminPanel();
    });

    document.getElementById("authModal").addEventListener("click", (e) => {
        if (e.target.id === "authModal") hideAdminPanel();
    });
});

// Actualizar estado cada minuto
setInterval(updateStatusIndicator, 60000);        category: "snacks",
        price: 3500,
        stock: 10,
        emoji: "🧁"
    },
    {
        id: 5,
        name: "Pack Promoción (Variado)",
        category: "promociones",
        price: 8000,
        stock: 5,
        emoji: "🎁",
        isPromotion: true
    }
];

// Estado global
let state = {
    products: [],
    cart: [],
    adminPassword: "1234", // Contraseña por defecto
    openTime: "08:00",
    closeTime: "20:00",
    currentFilter: "todos"
};

// ===============================================
// UTILIDADES
// ===============================================

function loadState() {
    const saved = localStorage.getItem("dulceExplosionState");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.products = parsed.products || INITIAL_PRODUCTS;
            state.cart = parsed.cart || [];
            state.adminPassword = parsed.adminPassword || "1234";
            state.openTime = parsed.openTime || "08:00";
            state.closeTime = parsed.closeTime || "20:00";
        } catch (e) {
            console.error("Error loading state:", e);
            state.products = INITIAL_PRODUCTS;
        }
    } else {
        state.products = INITIAL_PRODUCTS;
    }
}

function saveState() {
    localStorage.setItem("dulceExplosionState", JSON.stringify(state));
}

function formatPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP"
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
    
    if (isOpen) {
        dot.className = "status-dot open";
        text.textContent = "Abierto";
    } else {
        dot.className = "status-dot closed";
        text.textContent = "Cerrado";
    }
}

// Actualizar cada minuto
setInterval(updateStatusIndicator, 60000);

// ===============================================
// INTERFAZ DE PRODUCTOS
// ===============================================

function renderProducts() {
    const grid = document.getElementById("productsGrid");
    const filtered = state.products.filter(p => {
        if (state.currentFilter === "todos") return true;
        return p.category === state.currentFilter;
    });

    grid.innerHTML = filtered.map(product => {
        const cartItem = state.cart.find(i => i.id === product.id);
        const isLowStock = product.stock <= 3 && product.stock > 0;
        const isOutOfStock = product.stock === 0;
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                ${product.isPromotion ? '<div class="promotion-badge">⭐ PROMOCIÓN</div>' : ''}
                <div class="product-emoji">${product.emoji}</div>
                <div class="product-info">
                    <div class="product-category">${product.category.replace("promociones", "Promo")}</div>
                    <h3 class="product-name">${product.name}</h3>
                    ${isLowStock ? '<div class="stock-alert">⚠️ Últimas unidades</div>' : ''}
                    <p class="product-stock">
                        ${isOutOfStock 
                            ? '<span style="color: #f44336; font-weight: 700;">Agotado</span>' 
                            : `Stock: ${product.stock}`}
                    </p>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div class="product-actions">
                        <input type="number" class="quantity-input" value="${cartItem?.quantity || 1}" min="1" max="${product.stock}" data-product-id="${product.id}">
                        <button class="add-to-cart-btn" data-product-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
                            🛒 Agregar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Event listeners para productos
    document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const productId = parseInt(btn.dataset.productId);
            const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            const quantity = parseInt(qtyInput.value) || 1;
            addToCart(productId, quantity);
        });
    });

    // Validar cantidad máxima
    document.querySelectorAll(".quantity-input").forEach(input => {
        input.addEventListener("change", function() {
            const product = state.products.find(p => p.id === parseInt(this.dataset.productId));
            if (parseInt(this.value) > product.stock) {
                this.value = product.stock;
            }
            if (parseInt(this.value) < 1) {
                this.value = 1;
            }
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
        alert("No hay suficiente stock de este producto");
        return;
    }

    const existingItem = state.cart.find(i => i.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            alert("No hay suficiente stock para agregar más");
            return;
        }
        existingItem.quantity += quantity;
    } else {
        state.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: quantity,
            emoji: product.emoji,
            isPromotion: product.isPromotion || false
        });
    }

    saveState();
    updateCartUI();
    showCartFeedback();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    saveState();
    updateCartUI();
}

function updateCartQuantity(productId, quantity) {
    const item = state.cart.find(i => i.id === productId);
    const product = state.products.find(p => p.id === productId);
    
    if (item) {
        if (quantity > product.stock) {
            alert("No hay suficiente stock");
            return;
        }
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            saveState();
            updateCartUI();
        }
    }
}

function calculateTotal() {
    return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartUI() {
    const cartItems = document.getElementById("cartItems");
    const cartCount = document.getElementById("cartCount");
    const total = calculateTotal();
    
    cartCount.textContent = state.cart.length;

    if (state.cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-message">Tu carrito está vacío</p>';
        document.getElementById("subtotal").textContent = "$0";
        document.getElementById("total").textContent = "$0";
        return;
    }

    cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">${item.emoji} ${item.name}</div>
            <div class="cart-item-price">${formatPrice(item.price)} c/u</div>
            <div class="cart-item-controls">
                <input type="number" class="cart-item-qty" value="${item.quantity}" min="1" data-product-id="${item.id}">
                <span style="color: #999;">= ${formatPrice(item.price * item.quantity)}</span>
                <button class="cart-item-remove" data-product-id="${item.id}">Quitar</button>
            </div>
        </div>
    `).join("");

    document.getElementById("subtotal").textContent = formatPrice(total);
    document.getElementById("total").textContent = formatPrice(total);

    // Event listeners del carrito
    document.querySelectorAll(".cart-item-qty").forEach(input => {
        input.addEventListener("change", function() {
            updateCartQuantity(parseInt(this.dataset.productId), parseInt(this.value));
        });
    });

    document.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", () => {
            removeFromCart(parseInt(btn.dataset.productId));
        });
    });
}

function showCartFeedback() {
    const cartBtn = document.getElementById("cartButton");
    cartBtn.style.transform = "scale(1.1)";
    setTimeout(() => {
        cartBtn.style.transform = "scale(1)";
    }, 300);
}

function clearCart() {
    if (state.cart.length === 0) {
        alert("El carrito ya está vacío");
        return;
    }
    if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
        state.cart = [];
        saveState();
        updateCartUI();
    }
}

// ===============================================
// CARRITO MODAL (Mobile)
// ===============================================

function toggleCartSidebar() {
    const sidebar = document.getElementById("cartSidebar");
    const modal = document.getElementById("cartModal");
    
    sidebar.classList.toggle("active");
    modal.classList.toggle("active");
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
    let message = "🛒 *Pedido desde Dulce Explosión*\n\n";
    message += "📋 *Detalles del pedido:*\n";
    
    state.cart.forEach(item => {
        message += `\n${item.emoji} ${item.name}\n`;
        message += `  • Cantidad: ${item.quantity}\n`;
        message += `  • Precio unitario: ${formatPrice(item.price)}\n`;
        message += `  • Subtotal: ${formatPrice(item.price * item.quantity)}\n`;
    });

    message += `\n💰 *TOTAL: ${formatPrice(total)}*\n`;
    message += "\n✅ Gracias por tu compra en Dulce Explosión 🍭";

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");

    // Limpiar carrito después de hacer checkout
    setTimeout(() => {
        state.cart = [];
        saveState();
        updateCartUI();
    }, 1000);
}

// ===============================================
// PANEL DE ADMINISTRACIÓN
// ===============================================

function showAdminPanel() {
    const authModal = document.getElementById("authModal");
    authModal.classList.add("active");
}

function hideAdminPanel() {
    document.getElementById("adminPanel").classList.remove("active");
    document.getElementById("authModal").classList.remove("active");
}

function verifyAdminPassword() {
    const password = document.getElementById("adminPassword").value;
    if (password === state.adminPassword) {
        document.getElementById("authModal").classList.remove("active");
        document.getElementById("adminPanel").classList.add("active");
        renderAdminPanel();
        document.getElementById("adminPassword").value = "";
    } else {
        alert("Contraseña incorrecta");
    }
}

function renderAdminPanel() {
    renderAdminProducts();
    updateAdminSettings();
}

function renderAdminProducts() {
    const list = document.getElementById("productsAdminList");
    
    list.innerHTML = state.products.map(product => `
        <div class="product-admin-item">
            <div class="product-admin-info">
                <div class="product-admin-name">${product.emoji} ${product.name}</div>
                <div class="product-admin-price">${formatPrice(product.price)}</div>
                <div class="product-admin-stock">Stock: <strong>${product.stock}</strong></div>
            </div>
            <div class="stock-controls">
                <button class="stock-btn minus-btn" data-product-id="${product.id}">−</button>
                <div class="stock-display" id="stock-${product.id}">${product.stock}</div>
                <button class="stock-btn plus-btn" data-product-id="${product.id}">+</button>
                <button class="delete-btn" data-product-id="${product.id}">Eliminar</button>
            </div>
        </div>
    `).join("");

    // Event listeners para stock
    document.querySelectorAll(".plus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            modifyStock(parseInt(btn.dataset.productId), 1);
        });
    });

    document.querySelectorAll(".minus-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            modifyStock(parseInt(btn.dataset.productId), -1);
        });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar este producto?")) {
                deleteProduct(parseInt(btn.dataset.productId));
            }
        });
    });
}

function modifyStock(productId, amount) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
        product.stock = Math.max(0, product.stock + amount);
        saveState();
        document.getElementById(`stock-${productId}`).textContent = product.stock;
        renderProducts(); // Actualizar vista de tienda
    }
}

function deleteProduct(productId) {
    state.products = state.products.filter(p => p.id !== productId);
    state.cart = state.cart.filter(i => i.id !== productId);
    saveState();
    renderAdminProducts();
    renderProducts();
}

function addProduct() {
    const form = document.getElementById("addProductForm");
    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value;
    const price = parseFloat(document.getElementById("productPrice").value);
    const stock = parseInt(document.getElementById("productStock").value);
    const emoji = document.getElementById("productEmoji").value.trim() || "🍭";

    if (!name || !category || !price || stock < 0) {
        alert("Por favor completa todos los campos correctamente");
        return;
    }

    const newId = Math.max(...state.products.map(p => p.id), 0) + 1;
    state.products.push({
        id: newId,
        name,
        category,
        price,
        stock,
        emoji,
        isPromotion: category === "promociones"
    });

    saveState();
    renderProducts();
    renderAdminProducts();
    form.reset();
    document.getElementById("productEmoji").value = "🍭";
    alert("Producto agregado exitosamente");
}

function updateAdminSettings() {
    document.getElementById("openTime").value = state.openTime;
    document.getElementById("closeTime").value = state.closeTime;
}

function saveTimes() {
    const openTime = document.getElementById("openTime").value;
    const closeTime = document.getElementById("closeTime").value;

    if (openTime >= closeTime) {
        alert("La hora de cierre debe ser después de la de apertura");
        return;
    }

    state.openTime = openTime;
    state.closeTime = closeTime;
    saveState();
    updateStatusIndicator();
    alert("Horario guardado");
}

function changePassword() {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;

    if (current !== state.adminPassword) {
        alert("Contraseña actual incorrecta");
        return;
    }

    if (!newPass || newPass.length < 4) {
        alert("La nueva contraseña debe tener al menos 4 caracteres");
        return;
    }

    state.adminPassword = newPass;
    saveState();
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    alert("Contraseña cambiada exitosamente");
}

function resetAllData() {
    if (confirm("⚠️ Esto eliminará TODOS los datos (productos, carrito, configuración). ¿Estás seguro?")) {
        if (confirm("Confirma una vez más: ¿Realmente deseas eliminar todo?")) {
            state.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
            state.cart = [];
            state.adminPassword = "1234";
            state.openTime = "08:00";
            state.closeTime = "20:00";
            saveState();
            renderProducts();
            renderAdminProducts();
            alert("Datos reiniciados");
        }
    }
}

// ===============================================
// FILTROS
// ===============================================

function setFilter(category) {
    state.currentFilter = category;
    
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelector(`[data-category="${category}"]`).classList.add("active");
    
    renderProducts();
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // Cargar estado
    loadState();
    
    // Renderizar interfaz
    renderProducts();
    updateCartUI();
    updateStatusIndicator();

    // Carrito
    document.getElementById("cartButton").addEventListener("click", toggleCartSidebar);
    document.getElementById("closeCart").addEventListener("click", toggleCartSidebar);
    document.getElementById("cartModal").addEventListener("click", toggleCartSidebar);
    document.getElementById("checkoutBtn").addEventListener("click", checkout);
    document.getElementById("clearCartBtn").addEventListener("click", clearCart);

    // Filtros
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            setFilter(btn.dataset.category);
        });
    });

    // Admin
    document.getElementById("adminAccessBtn").addEventListener("click", showAdminPanel);
    document.getElementById("adminCloseBtn").addEventListener("click", hideAdminPanel);
    document.getElementById("authSubmitBtn").addEventListener("click", verifyAdminPassword);
    document.getElementById("authCancelBtn").addEventListener("click", hideAdminPanel);
    document.getElementById("adminPassword").addEventListener("keypress", (e) => {
        if (e.key === "Enter") verifyAdminPassword();
    });

    // Admin tabs
    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".admin-content").forEach(c => c.classList.remove("active"));
            
            tab.classList.add("active");
            document.querySelector(`[data-content="${tabName}"]`).classList.add("active");
        });
    });

    // Admin form
    document.getElementById("addProductForm").addEventListener("submit", (e) => {
        e.preventDefault();
        addProduct();
    });

    // Admin settings
    document.getElementById("saveTimesBtn").addEventListener("click", saveTimes);
    document.getElementById("changePasswordBtn").addEventListener("click", changePassword);
    document.getElementById("resetDataBtn").addEventListener("click", resetAllData);

    // Cerrar admin al hacer click fuera
    document.getElementById("adminPanel").addEventListener("click", (e) => {
        if (e.target.id === "adminPanel") {
            hideAdminPanel();
        }
    });

    document.getElementById("authModal").addEventListener("click", (e) => {
        if (e.target.id === "authModal") {
            hideAdminPanel();
        }
    });
});

// Actualizar estado cada 5 segundos en background
setInterval(() => {
    const prevStatus = getIsOpen();
    setTimeout(() => {
        if (getIsOpen() !== prevStatus) {
            updateStatusIndicator();
        }
    }, 1000);
}, 5000);
