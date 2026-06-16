// ===============================================
// DULCE EXPLOSIÓN - APLICACIÓN PRINCIPAL
// ===============================================

// Número de WhatsApp (reemplazar con el tuyo)
const WHATSAPP_NUMBER = "573222005193"; // Formato: país + número sin espacios

// Productos iniciales de demostración
const INITIAL_PRODUCTS = [
    {
        id: 1,
        name: "Chocolate Blanco",
        category: "chocolates",
        price: 2500,
        stock: 15,
        emoji: "🍫"
    },
    {
        id: 2,
        name: "Gomitas Fresa",
        category: "gomitas",
        price: 1500,
        stock: 25,
        emoji: "🍬"
    },
    {
        id: 3,
        name: "Caramelos Duros",
        category: "gomitas",
        price: 1000,
        stock: 2,
        emoji: "🍭"
    },
    {
        id: 4,
        name: "Cupcake Chocolate",
        category: "snacks",
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
