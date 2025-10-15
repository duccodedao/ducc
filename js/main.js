// main.js

function shopData() {
    return {
        products: [], filteredProducts: [], cart: [], openCart: false, isLoading: true, searchTerm: '',
        
        isDetailModalOpen: false,
        isPrintingModalOpen: false,
        
        selectedProduct: {},
        selectedOptions: {},
        printingDetails: { name: '', number: '' },

        init() {
            this.fetchProducts();
            this.cart = JSON.parse(localStorage.getItem('cart')) || [];
            this.$watch('cart', () => this.saveCart());
            this.$watch('searchTerm', () => this.filterProducts());
        },
        async fetchProducts() {
            this.isLoading = true;
            try {
                const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
                this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.filteredProducts = this.products;
            } catch (error) { console.error("Lỗi tải sản phẩm:", error); } finally { this.isLoading = false; }
        },
        filterProducts() {
            if (!this.searchTerm.trim()) { this.filteredProducts = this.products; return; }
            const lowerCaseSearch = this.searchTerm.toLowerCase();
            this.filteredProducts = this.products.filter(p => p.name.toLowerCase().includes(lowerCaseSearch) || (p.sku && p.sku.toLowerCase().includes(lowerCaseSearch)) || (p.storeName && p.storeName.toLowerCase().includes(lowerCaseSearch)));
        },

        openDetailModal(product) {
            this.selectedProduct = product;
            this.selectedOptions = {}; // Reset options
            // Set default options if available
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
