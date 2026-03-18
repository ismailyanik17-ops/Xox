const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- MONGODB ATLAS BAĞLANTISI ---
// <db_password> kısmını Atlas'taki şifrenle değiştirmeyi UNUTMA!
const MONGO_URI = 'mongodb+srv://iso:xoxdeneme@cluster0.gt06c6w.mongodb.net/?appName=Cluster0'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Sultanım, MongoDB bağlantısı başarılı!'))
    .catch(err => console.error('MongoDB hatası:', err));

const userSchema = new mongoose.Schema({
    username: String,
    puan: { type: Number, default: 50 },
    w: { type: Number, default: 0 },
    d: { type: Number, default: 0 },
    l: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

let havuzlar = { "5": [], "15": [], "30": [] };

io.on('connection', (socket) => {
    console.log('Yeni sultan bağlandı:', socket.id);

    socket.on('havuzaGir', (data) => {
        socket.oyuncu = data;
        if (havuzlar[data.sure] && havuzlar[data.sure].length > 0) {
            const rakip = havuzlar[data.sure].shift();
            const oda = `oda_${socket.id}_${rakip.id}`;
            socket.join(oda);
            rakip.join(oda);
            
            const baslayan = Math.random() < 0.5 ? 'X' : 'O';
            
            rakip.emit('macBasladi', { rakipAd: data.ad, sembol: 'X', oda: oda, baslayan: baslayan });
            socket.emit('macBasladi', { rakipAd: rakip.oyuncu.ad, sembol: 'O', oda: oda, baslayan: baslayan });
        } else {
            if (havuzlar[data.sure]) havuzlar[data.sure].push(socket);
        }
    });

    socket.on('hamleYap', (data) => {
        socket.to(data.oda).emit('rakipHamleYapti', { idx: data.idx, sembol: data.sembol });
    });

    socket.on('updateStats', async (data) => {
        try {
            await User.findOneAndUpdate({ username: data.ad }, data, { upsert: true });
        } catch (e) { console.log("Stat hatası"); }
    });

    socket.on('getLeaderboard', async () => {
        try {
            const top = await User.find().sort({ puan: -1 }).limit(10);
            socket.emit('leaderboardData', top);
        } catch (e) { console.log("Liderlik hatası"); }
    });

    socket.on('disconnect', () => {
        for (let s in havuzlar) havuzlar[s] = havuzlar[s].filter(skt => skt.id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));