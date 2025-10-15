// order-success.js

function orderSuccessPage() {
    return {
        orderId: null,
        init() {
            const urlParams = new URLSearchParams(window.location.search);
            this.orderId = urlParams.get('orderId');
        }
    };
}