const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// --- 1. MONGODB ATLAS BAĞLANTISI ---
const MONGO_URI = 'mongodb+srv://iso:<db_password>@cluster0.gt06c6w.mongodb.net/?appName=Cluster0'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Sultanım, MongoDB Atlas bağlantısı muzafferiyetle sağlandı!'))
    .catch(err => console.error('Veritabanı bağlantı hatası:', err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    puan: { type: Number, default: 50 },
    w: { type: Number, default: 0 },
    d: { type: Number, default: 0 },
    l: { type: Number, default: 0 },
    id: { type: Number, default: () => Math.floor(Math.random() * 89999) + 10000 },
    tema: { type: String, default: 'tema-koyu' }
});

const User = mongoose.model('User', userSchema);
let havuzlar = { "5": [], "15": [], "30": [] };

io.on('connection', (socket) => {
    console.log('Saray kapısında yeni bir sultan:', socket.id);

    socket.on('register', async (data) => {
        try {
            const newUser = new User({ username: data.u, password: data.p });
            await newUser.save();
            socket.emit('authResponse', { success: true, message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' });
        } catch (err) {
            socket.emit('authResponse', { success: false, message: 'Bu isim sarayda zaten kayıtlı!' });
        }
    });

    socket.on('login', async (data) => {
        try {
            const user = await User.findOne({ username: data.u, password: data.p });
            if (user) {
                socket.userData = user;
                socket.emit('authResponse', { success: true, user: user });
            } else {
                socket.emit('authResponse', { success: false, message: 'Hatalı kullanıcı adı veya şifre!' });
            }
        } catch (err) {
            socket.emit('authResponse', { success: false, message: 'Giriş işlemi başarısız!' });
        }
    });

    socket.on('getLeaderboard', async () => {
        try {
            const top = await User.find().sort({ puan: -1 }).limit(10);
            socket.emit('leaderboardData', top);
        } catch (err) {
            console.error('Liderlik tablosu hatası:', err);
        }
    });

    socket.on('updateStats', async (data) => {
        if (socket.userData) {
            try { await User.findOneAndUpdate({ username: socket.userData.username }, data); } 
            catch (err) { console.error('İstatistik güncelleme hatası:', err); }
        }
    });

    socket.on('havuzaGir', (data) => {
        socket.oyuncu = data;
        if (havuzlar[data.sure] && havuzlar[data.sure].length > 0) {
            const rakip = havuzlar[data.sure].shift();
            const oda = `oda_${socket.id}_${rakip.id}`;
            socket.join(oda);
            rakip.join(oda);
            
            // KURA ÇEKİMİ: İlk kimin başlayacağını Server belirliyor (%50 ihtimal)
            const baslayanSira = Math.random() < 0.5 ? 'X' : 'O';
            
            rakip.emit('macBasladi', { rakipAd: data.ad, sembol: 'X', oda: oda, baslayan: baslayanSira });
            socket.emit('macBasladi', { rakipAd: rakip.oyuncu.ad, sembol: 'O', oda: oda, baslayan: baslayanSira });
            console.log(`Eşleşme sağlandı: ${oda} | Başlayan: ${baslayanSira}`);
        } else {
            if (havuzlar[data.sure]) havuzlar[data.sure].push(socket);
        }
    });

    socket.on('hamleYap', (data) => {
        if (data.oda) socket.to(data.oda).emit('rakipHamleYapti', { idx: data.idx, sembol: data.sembol });
    });

    socket.on('disconnect', () => {
        for (let s in havuzlar) havuzlar[s] = havuzlar[s].filter(skt => skt.id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sultanlar Divanı ${PORT} portu üzerinde kuruldu!`);
});