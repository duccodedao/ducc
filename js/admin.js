// admin.js

auth.onAuthStateChanged(user => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const adminContent = document.getElementById('admin-content');
    if (user) {
        getUserRole(user.uid).then(role => {
            if (role === 'admin') {
                loadingOverlay.style.display = 'none';
                adminContent.style.display = 'block';
                const adminComponent = document.querySelector('[x-data="adminPanel()"]').__x;
                if (adminComponent) adminComponent.$data.init();
            } else {
                alert("Bạn không có quyền truy cập trang này.");
                window.location.href = 'index.html';
            }
        });
    } else {
        alert("Vui lòng đăng nhập để truy cập.");
        window.location.href = 'login.html';
    }
});

function adminPanel() {
    return {
        // --- State ---
        activeTab: 'orders',
        products: [], orders: [], vouchers: [], filteredOrders: [], activeFilter: 'Chờ xác nhận',
        orderSearchTerm: '', productCount: 0,
        orderCounts: { 'all': 0, 'Chờ xác nhận': 0, 'Đang xử lý': 0, 'Đang giao hàng': 0, 'Đã giao hàng': 0, 'Đã hủy': 0, 'Đã hoàn tiền': 0 },
        isModalOpen: false, isVoucherModalOpen: false,
        editingProduct: {},
        newVoucher: { code: '', type: 'fixed', value: 0, maxUses: 1, description: '' },
        
        // --- Product Categories & Fields ---
        categories: [
            'Quần áo thể thao', 'Giày thể thao', 'Áo đấu – Áo CLB/Đội tuyển',
            'Quần thể thao', 'Phụ kiện thể thao', 'Túi – Ba lô thể thao', 'Dụng cụ thể thao'
        ],

        // --- Methods ---
        init() {
            this.fetchProducts(); this.fetchOrders(); this.fetchVouchers();
            this.$watch('orderSearchTerm', () => this.filterOrders());
            this.resetEditingProduct();
        },
        
        resetEditingProduct() {
            this.editingProduct = { 
                id: null, name: '', price: null, sku: 'HDS-' + Date.now().toString().slice(-6), imageUrl: '', category: this.categories[0],
                // Attributes - comma-separated strings
                availableSizes: '', availableColors: '',
                gender: 'Unisex', version: 'Sân nhà', length: 'Dài', style: 'Thoải mái',
                shoeType: '', accessoryType: '', toolType: '',
                capacity: '',
                // Flags for options
                hasPlayerOption: false, hasVersionOption: false
            };
        },

        formatCurrency(amount) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); },
        formatDate(timestamp) { if (!timestamp) return 'N/A'; return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN'); },

        // --- Product Management ---
        fetchProducts() { db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => { this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); this.productCount = snapshot.size; }); },
        openAddModal() { this.resetEditingProduct(); this.isModalOpen = true; },
        openEditModal(product) {
            // Ensure all fields exist when editing an old product
            const defaultFields = this.resetEditingProduct();
            this.editingProduct = { ...defaultFields, ...product };
            this.isModalOpen = true;
        },
        async saveProduct() {
            if (!this.editingProduct.name || !this.editingProduct.price || !this.editingProduct.category) {
                return alert('Vui lòng điền các thông tin bắt buộc: Tên, Giá, Danh mục.');
            }
            try {
                const { id, ...productData } = this.editingProduct;
                if (id) {
                    await db.collection('products').doc(id).update(productData);
                    alert('Cập nhật sản phẩm thành công!');
                } else {
                    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('products').add(productData);
                    alert('Thêm sản phẩm thành công!');
                }
                this.isModalOpen = false;
            } catch (e) {
                alert('Lỗi lưu sản phẩm: ' + e.message);
            }
        },
        async deleteProduct(id, name) { if (confirm(`Xóa sản phẩm "${name}"?`)) { try { await db.collection('products').doc(id).delete(); alert('Xóa thành công!'); } catch (e) { alert('Lỗi: ' + e.message); } } },

        // --- Order Management ---
        fetchOrders() { db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => { this.orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); this.calculateOrderCounts(); this.filterOrders(); }); },
        calculateOrderCounts() { const counts = { 'all': this.orders.length, 'Chờ xác nhận': 0, 'Đang xử lý': 0, 'Đang giao hàng': 0, 'Đã giao hàng': 0, 'Đã hủy': 0, 'Đã hoàn tiền': 0 }; this.orders.forEach(order => { if (counts[order.status] !== undefined) counts[order.status]++; }); this.orderCounts = counts; },
        filterOrders() { let items = this.orders; if (this.activeFilter !== 'all') items = items.filter(o => o.status === this.activeFilter); const term = this.orderSearchTerm.trim().toLowerCase(); if (term) { items = items.filter(o => o.id.toLowerCase().includes(term) || o.customerInfo.name.toLowerCase().includes(term) || o.customerInfo.phone.includes(term)); } this.filteredOrders = items; },
        setFilter(status) { this.activeFilter = status; this.filterOrders(); },
        async updateOrderStatus(orderId, newStatus) { try { await db.collection('orders').doc(orderId).update({ status: newStatus }); } catch (e) { alert('Lỗi: ' + e.message); } },
        
        // --- Voucher Management ---
        fetchVouchers() { db.collection('vouchers').orderBy('createdAt', 'desc').onSnapshot(snapshot => { this.vouchers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }); },
        async saveVoucher() { const { code, value, maxUses } = this.newVoucher; if (!code || !value || value <= 0 || !maxUses || maxUses <= 0) return alert('Thông tin không hợp lệ.'); try { const voucherData = { type: this.newVoucher.type, value: parseFloat(value), description: this.newVoucher.description || '', maxUses: parseInt(maxUses, 10), usedBy: [], usageCount: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() }; await db.collection('vouchers').doc(code.toUpperCase()).set(voucherData); alert('Thêm voucher thành công!'); this.newVoucher = { code: '', type: 'fixed', value: 0, maxUses: 1, description: '' }; this.isVoucherModalOpen = false; } catch (e) { alert('Lỗi: ' + e.message); } },
        async deleteVoucher(id) { if (confirm(`Xóa voucher "${id}"?`)) { try { await db.collection('vouchers').doc(id).delete(); alert('Xóa thành công!'); } catch (e) { alert('Lỗi: ' + e.message); } } },

        // --- Print ---
        printOrder(order) {
            const printableArea = document.getElementById('printable-area');
            const itemsHtml = order.items.map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">${item.name} <br> <small>SKU: ${item.sku || 'N/A'}</small>${item.selectedOptions ? `<br><small style="color: #555;">${Object.entries(item.selectedOptions).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join(', ')}</small>`: ''}${item.printing_notes ? `<br><small style="color: #d9534f;"><strong>In ấn:</strong> ${item.printing_notes}</small>` : ''}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${this.formatCurrency(item.price)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${this.formatCurrency(item.price * item.quantity)}</td></tr>`).join('');
            const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const discountHtml = order.discountAmount > 0 ? `<tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Giảm giá (${order.appliedVoucher})</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">-${this.formatCurrency(order.discountAmount)}</td></tr>` : '';
            printableArea.innerHTML = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 20px;"><div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px;"><div><h1 style="margin: 0; font-size: 28px;">HÓA ĐƠN</h1><p style="margin: 5px 0 0 0;"><strong>Cửa hàng:</strong> HD Sports</p></div><div style="text-align: right;"><svg id="barcode-container"></svg><p style="margin: 0; font-size: 12px;"><strong>Mã ĐH:</strong> ${order.id}</p></div></div><div style="margin-top: 20px;"><p><strong>Ngày đặt:</strong> ${this.formatDate(order.createdAt)}</p><p><strong>Khách hàng:</strong> ${order.customerInfo.name}</p><p><strong>SĐT:</strong> ${order.customerInfo.phone}</p><p><strong>Địa chỉ:</strong> ${order.customerInfo.address}</p>${order.notes ? `<p><strong>Ghi chú:</strong> ${order.notes}</p>` : ''}</div><h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Chi tiết sản phẩm:</h3><table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;"><thead><tr><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Sản phẩm</th><th style="padding: 8px; border: 1px solid #ddd; text-align: center;">SL</th><th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Đơn giá</th><th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Thành tiền</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Tạm tính</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${this.formatCurrency(subtotal)}</td></tr>${discountHtml}<tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 1.1em;">TỔNG CỘNG</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 1.1em;">${this.formatCurrency(order.totalAmount)}</td></tr></tfoot></table><p style="margin-top: 20px;"><strong>Thanh toán:</strong> ${order.paymentMethod === 'cod' ? 'Khi nhận hàng' : 'Chuyển khoản'}</p><p style="text-align: center; margin-top: 50px;">Cảm ơn quý khách!</p></div>`;
            const barcodeContainer = printableArea.querySelector('#barcode-container');
            if (barcodeContainer && typeof JsBarcode === 'function') { try { JsBarcode(barcodeContainer, order.id, { format: "CODE128", height: 40, displayValue: false, margin: 0 }); } catch (e) { console.error("Lỗi tạo mã vạch:", e); } }
            printableArea.classList.remove('hidden');
            const cleanup = () => { printableArea.classList.add('hidden'); window.removeEventListener('afterprint', cleanup); };
            window.addEventListener('afterprint', cleanup);
            window.print();
        }
    };
}
window.adminPanel = adminPanel;