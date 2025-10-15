// checkout.js

const bankConfig = {
    BANK_ID: 'MB',
    ACCOUNT_NO: '0123456789',
    ACCOUNT_NAME: 'NGUYEN VAN A'
};

auth.onAuthStateChanged(user => {
    if (!user) {
        alert("Vui lòng đăng nhập để thanh toán.");
        window.location.href = `login.html?redirect=checkout.html`;
    }
});

function checkoutPage() {
    return {
        cart: [], customer: { name: '', phone: '', address: '', notes: '' },
        isLoading: false, paymentMethod: 'cod', voucherCode: '',
        appliedVoucher: null, discountAmount: 0, voucherMessage: '',

        init() {
            this.cart = JSON.parse(localStorage.getItem('cart')) || [];
            if (this.cart.length === 0) {
                alert("Giỏ hàng trống.");
                window.location.href = 'index.html';
            }
        },
        get subtotal() { return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0); },
        get totalPrice() { const finalTotal = this.subtotal - this.discountAmount; return finalTotal > 0 ? finalTotal : 0; },
        formatCurrency(amount) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); },
        get vietQRUrl() {
            if (this.totalPrice <= 0) return '';
            const amount = this.totalPrice;
            const addInfo = `HDSPORT${Math.floor(Date.now() / 1000)}`;
            return `https://img.vietqr.io/image/${bankConfig.BANK_ID}-${bankConfig.ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURI(addInfo)}&accountName=${encodeURI(bankConfig.ACCOUNT_NAME)}`;
        },
        async applyVoucher() {
            const user = auth.currentUser;
            if (!user) return alert("Vui lòng đăng nhập để áp dụng voucher.");
            if (!this.voucherCode.trim()) return;

            this.voucherMessage = 'Đang kiểm tra...';
            this.discountAmount = 0;
            this.appliedVoucher = null;

            const code = this.voucherCode.toUpperCase();
            const voucherRef = db.collection('vouchers').doc(code);

            try {
                const doc = await voucherRef.get();
                if (!doc.exists) {
                    this.voucherMessage = 'Mã voucher không hợp lệ.';
                    return;
                }
                const voucher = doc.data();
                
                if ((voucher.usageCount || 0) >= voucher.maxUses) {
                    this.voucherMessage = 'Voucher đã hết lượt sử dụng.';
                    return;
                }
                if (voucher.usedBy && voucher.usedBy.includes(user.uid)) {
                    this.voucherMessage = 'Bạn đã sử dụng voucher này rồi.';
                    return;
                }

                let discount = 0;
                if (voucher.type === 'fixed') discount = voucher.value;
                else if (voucher.type === 'percent') discount = (this.subtotal * voucher.value) / 100;
                
                this.discountAmount = discount > this.subtotal ? this.subtotal : discount;
                this.appliedVoucher = { id: doc.id, ...voucher };
                this.voucherMessage = `Áp dụng thành công! Giảm ${this.formatCurrency(this.discountAmount)}.`;
            } catch (e) {
                this.voucherMessage = 'Lỗi khi áp dụng voucher.';
            }
        },
        removeVoucher() {
            this.voucherCode = ''; this.appliedVoucher = null; this.discountAmount = 0; this.voucherMessage = '';
        },
        async placeOrder() {
            const user = auth.currentUser;
            if (!user) return alert("Phiên đăng nhập đã hết hạn.");
            if (!this.customer.name || !this.customer.phone || !this.customer.address) return alert('Vui lòng điền đủ thông tin.');

            this.isLoading = true;
            let newOrderId = null;

            try {
                await db.runTransaction(async (transaction) => {
                    const orderData = {
                        userId: user.uid, customerInfo: this.customer,
                        items: this.cart, // Giữ nguyên toàn bộ thông tin cart item
                        totalAmount: this.totalPrice, discountAmount: this.discountAmount,
                        appliedVoucher: this.appliedVoucher ? this.appliedVoucher.id : null,
                        notes: this.customer.notes || '', status: "Chờ xác nhận",
                        paymentMethod: this.paymentMethod, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    if (this.appliedVoucher) {
                        const voucherRef = db.collection('vouchers').doc(this.appliedVoucher.id);
                        const voucherDoc = await transaction.get(voucherRef);

                        if (!voucherDoc.exists) throw new Error("Voucher không còn tồn tại.");
                        
                        const voucherData = voucherDoc.data();
                        if ((voucherData.usageCount || 0) >= voucherData.maxUses) throw new Error("Voucher đã hết lượt sử dụng trong lúc bạn thanh toán.");
                        if (voucherData.usedBy && voucherData.usedBy.includes(user.uid)) throw new Error("Bạn đã sử dụng voucher này.");

                        transaction.update(voucherRef, {
                            usageCount: firebase.firestore.FieldValue.increment(1),
                            usedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
                        });
                    }

                    const orderRef = db.collection('orders').doc();
                    newOrderId = orderRef.id; // Lấy ID trước khi set
                    transaction.set(orderRef, orderData);
                });

                localStorage.removeItem('cart');
                window.location.href = `order-success.html?orderId=${newOrderId}`;

            } catch (error) {
                console.error("Lỗi đặt hàng:", error);
                alert("Lỗi khi đặt hàng: " + error.message);
                this.voucherMessage = "Lỗi voucher: " + error.message + ". Vui lòng thử lại.";
                this.isLoading = false;
            }
        }
    }
}
window.checkoutPage = checkoutPage;