// profile.js

function profilePage() {
    return {
        orders: [], isLoading: true, isEditModalOpen: false, errorMessage: '',
        editingOrderInfo: { id: null, name: '', phone: '', address: '', notes: '' },
        isRatingModalOpen: false,
        ratingData: { orderId: null, itemId: null, rating: 0, comment: '' },
        orderStats: { total: 0, 'Chờ xác nhận': 0, 'Đang xử lý': 0, 'Đang giao hàng': 0, 'Đã giao hàng': 0, 'Đã hủy': 0 },

        init() {
            auth.onAuthStateChanged(user => {
                if (user) { this.fetchOrders(user.uid); } 
                else { window.location.href = 'login.html'; }
            });
        },

        fetchOrders(userId) {
            this.isLoading = true; this.errorMessage = '';
            db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').onSnapshot(querySnapshot => {
                this.orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.calculateOrderStats();
                this.isLoading = false;
            }, error => {
                console.error("Lỗi:", error);
                this.errorMessage = 'Không thể tải lịch sử đơn hàng.';
                this.isLoading = false;
            });
        },

        calculateOrderStats() {
            const stats = { total: this.orders.length, 'Chờ xác nhận': 0, 'Đang xử lý': 0, 'Đang giao hàng': 0, 'Đã giao hàng': 0, 'Đã hủy': 0 };
            this.orders.forEach(order => {
                if (stats.hasOwnProperty(order.status)) {
                    stats[order.status]++;
                }
            });
            this.orderStats = stats;
        },

        async confirmReceipt(orderId) {
            if (confirm('Bạn xác nhận đã nhận được hàng?')) {
                try {
                    await db.collection('orders').doc(orderId).update({ userConfirmed: true, status: 'Đã giao hàng' });
                } catch (e) { alert('Lỗi: ' + e.message); }
            }
        },

        openEditModal(order) {
            this.editingOrderInfo = { id: order.id, name: order.customerInfo.name, phone: order.customerInfo.phone, address: order.customerInfo.address, notes: order.notes || '' }; 
            this.isEditModalOpen = true; 
        },

        async saveOrderInfo() {
            const { id, name, phone, address, notes } = this.editingOrderInfo;
            if (!name || !phone || !address) return alert('Vui lòng điền đủ thông tin.');
            try {
                const orderRef = db.collection('orders').doc(id);
                await orderRef.update({ 'customerInfo.name': name, 'customerInfo.phone': phone, 'customerInfo.address': address, 'notes': notes });
                alert('Cập nhật thành công!');
                this.isEditModalOpen = false;
            } catch (e) { alert('Lỗi: ' + e.message); }
        },

        async cancelOrder(orderId) {
            if (confirm('Bạn chắc chắn muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.')) {
                try {
                    const orderRef = db.collection('orders').doc(orderId);
                    const orderDoc = await orderRef.get();
                    if (orderDoc.exists && orderDoc.data().status === 'Chờ xác nhận') {
                        await orderRef.update({ status: 'Đã hủy' });
                        alert('Hủy đơn hàng thành công.');
                    } else {
                        alert('Không thể hủy đơn hàng đã được xử lý hoặc không tồn tại.');
                    }
                } catch (e) { alert('Lỗi: ' + e.message); }
            }
        },

        openRatingModal(orderId, item) { this.ratingData = { orderId: orderId, item: item, rating: item.rating || 0, comment: item.comment || '' }; this.isRatingModalOpen = true; },
        setRating(star) { this.ratingData.rating = star; },
        async submitRating() { 
            if (this.ratingData.rating === 0) return alert('Vui lòng chọn số sao để đánh giá.');
            try { 
                const orderRef = db.collection('orders').doc(this.ratingData.orderId); 
                const orderDoc = await orderRef.get(); 
                if (!orderDoc.exists) throw new Error("Không tìm thấy đơn hàng!"); 
                const orderData = orderDoc.data(); 
                const updatedItems = orderData.items.map(item => {
                    // Cần một cách định danh item duy nhất, ví dụ kết hợp id và các options
                    if (item.id === this.ratingData.item.id && JSON.stringify(item.selectedOptions) === JSON.stringify(this.ratingData.item.selectedOptions)) {
                         return { ...item, rating: this.ratingData.rating, comment: this.ratingData.comment };
                    }
                    return item; 
                }); 
                await orderRef.update({ items: updatedItems }); 
                alert('Cảm ơn bạn đã đánh giá sản phẩm!'); 
                this.isRatingModalOpen = false; 
            } catch (e) { alert('Lỗi: ' + e.message); } 
        },
        
        formatCurrency(amount) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); },
        formatDate(timestamp) { if (!timestamp) return 'N/A'; return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN'); }
    };
}
window.profilePage = profilePage;