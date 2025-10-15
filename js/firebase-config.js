// Dán object firebaseConfig của bạn vào đây
const firebaseConfig = {
            apiKey: "AIzaSyCHjgJkqVmgpZ6s5HRobpqB6XT--Sa2_zY",
            authDomain: "tgapp-30a28.firebaseapp.com",
            projectId: "tgapp-30a28",
            storageBucket: "tgapp-30a28.firebasestorage.app",
            messagingSenderId: "329047273664",
            appId: "1:329047273664:web:c9e1bfe367afb54953fd25",
            measurementId: "G-68P4PT49B0"
        };

// Khởi tạo Firebase
const app = firebase.initializeApp(firebaseConfig);

// Khởi tạo các dịch vụ cần dùng
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();