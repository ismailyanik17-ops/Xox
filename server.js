const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const MONGO_URI = 'mongodb+srv://iso:123456789@cluster0.gt06c6w.mongodb.net/XOX_Sultan?retryWrites=true&w=majority'; 

mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB Bağlandı!'));

const userSchema = new mongoose.Schema({
    username: String,
    puan: { type: Number, default: 50 }
});
const User = mongoose.model('User', userSchema);

let havuzlar = { "5": [], "15": [], "30": [] };

io.on('connection', (socket) => {
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
            havuzlar[data.sure].push(socket);
        }
    });

    socket.on('hamleYap', (data) => {
        socket.to(data.oda).emit('rakipHamleYapti', { idx: data.idx, sembol: data.sembol });
    });

    socket.on('updateStats', async (data) => {
        await User.findOneAndUpdate({ username: data.ad }, { puan: data.puan }, { upsert: true });
    });

    socket.on('getLeaderboard', async () => {
        const top = await User.find().sort({ puan: -1 }).limit(10);
        socket.emit('leaderboardData', top);
    });

    socket.on('disconnect', () => {
        for (let s in havuzlar) havuzlar[s] = havuzlar[s].filter(skt => skt.id !== socket.id);
    });
});

server.listen(process.env.PORT || 3000);
