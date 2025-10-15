// main.js

function shopData() {
    return {
        // --- State ---
        products: [], 
        filteredProducts: [], 
        cart: [], 
        openCart: false, 
        isLoading: true, 
        searchTerm: '',
        activeCategory: 'Tất cả',

        isDetailModalOpen: false,
        isPrintingModalOpen: false,
        
        selectedProduct: {},
        selectedOptions: {},
        printingDetails: { name: '', number: '' },
        
        // --- Categories for UI ---
        categories: [
            { name: 'Tất cả', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>' },
            { name: 'Áo đấu – Áo CLB/Đội tuyển', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>' },
            { name: 'Giày thể thao', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>' },
            { name: 'Quần áo thể thao', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>' },
            { name: 'Dụng cụ thể thao', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v11.494m-9-5.747h18" /></svg>' },
            { name: 'Phụ kiện thể thao', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>' },
            { name: 'Túi – Ba lô thể thao', icon: '<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>' }
        ],

        // --- Methods ---
        init() {
            this.fetchProducts();
            this.cart = JSON.parse(localStorage.getItem('cart')) || [];
            this.$watch('cart', () => this.saveCart());
            this.$watch('searchTerm', () => this.performFilter());
            this.$watch('activeCategory', () => this.performFilter());
        },
        
        async fetchProducts() {
            this.isLoading = true;
            try {
                const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
                this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.performFilter();
            } catch (error) { 
                console.error("Lỗi tải sản phẩm:", error); 
            } finally { 
                this.isLoading = false; 
            }
        },
        
        getProductsByCategory(categoryName) {
            return this.products.filter(p => p.category === categoryName);
        },

        setCategory(categoryName) {
            this.activeCategory = categoryName;
            if(categoryName !== 'Tất cả') {
                 document.getElementById('all-products').scrollIntoView({ behavior: 'smooth' });
            }
        },
        
        performFilter() {
            let productsToFilter = this.products;
            
            if (this.activeCategory !== 'Tất cả') {
                productsToFilter = productsToFilter.filter(p => p.category === this.activeCategory);
            }

            if (this.searchTerm.trim()) {
                const lowerCaseSearch = this.searchTerm.toLowerCase();
                productsToFilter = productsToFilter.filter(p => 
                    p.name.toLowerCase().includes(lowerCaseSearch) ||
                    (p.sku && p.sku.toLowerCase().includes(lowerCaseSearch)) ||
                    (p.category && p.category.toLowerCase().includes(lowerCaseSearch))
                );
            }
            
            this.filteredProducts = productsToFilter;
        },

        openDetailModal(product) {
            this.selectedProduct = product;
            this.selectedOptions = {}; 
            if(product.availableSizes) this.selectedOptions.Size = product.availableSizes.split(',')[0].trim();
            if(product.availableColors) this.selectedOptions.Color = product.availableColors.split(',')[0].trim();
            if(product.hasVersionOption) this.selectedOptions.Version = 'Sân nhà';
            this.isDetailModalOpen = true;
        },

        addToCartFromDetail() {
            const productToAdd = { ...this.selectedProduct, quantity: 1, selectedOptions: this.selectedOptions, printing_notes: '' };
            if (this.selectedProduct.hasPlayerOption) {
                this.printingDetails = { name: '', number: '' };
                this.isPrintingModalOpen = true;
            } else {
                this.finalizeAddToCart(productToAdd);
            }
        },

        confirmPrintingAndAddToCart() {
            const { name, number } = this.printingDetails;
            let printingNotes = '';
            if (name || number) { printingNotes = `Tên: ${name || 'N/A'}, Số: ${number || 'N/A'}`; }
            const productToAdd = { ...this.selectedProduct, quantity: 1, selectedOptions: this.selectedOptions, printing_notes: printingNotes };
            this.finalizeAddToCart(productToAdd);
            this.isPrintingModalOpen = false;
        },
        
        finalizeAddToCart(productToAdd) {
            const existingItemIndex = this.cart.findIndex(item => 
                item.id === productToAdd.id &&
                JSON.stringify(item.selectedOptions || {}) === JSON.stringify(productToAdd.selectedOptions || {}) &&
                (item.printing_notes || '') === (productToAdd.printing_notes || '')
            );

            if (existingItemIndex > -1) {
                this.cart[existingItemIndex].quantity++;
            } else {
                this.cart.push(productToAdd);
            }
            
            this.showToast(`Đã thêm "${productToAdd.name}" vào giỏ!`);
            this.isDetailModalOpen = false;
        },
        
        removeFromCart(cartIndex) { this.cart.splice(cartIndex, 1); },
        updateQuantity(cartIndex, quantity) {
            const item = this.cart[cartIndex];
            if (item) {
                if (quantity > 0) item.quantity = quantity;
                else this.removeFromCart(cartIndex);
            }
        },
        saveCart() { localStorage.setItem('cart', JSON.stringify(this.cart)); },
        get totalPrice() { return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0); },
        get cartTotalItems() { return this.cart.reduce((total, item) => total + item.quantity, 0); },
        formatCurrency(amount) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); },
        showToast(message) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            const toastMessage = document.getElementById('toast-message');
            toastMessage.textContent = message;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }
    };
}
window.shopData = shopData;
