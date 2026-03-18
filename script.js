// --- 1. ELEMENT SEÇİMLERİ ---
const menuContainer = document.querySelector('#menu-container');
const mainButtons = document.querySelector('#main-buttons');
const difficultyContainer = document.querySelector('#difficulty-container');
const gameArea = document.querySelector('#game-area');
const statusText = document.querySelector('#status');
const cells = document.querySelectorAll('.cell');
const restartBtn = document.querySelector('#restart-btn');

// --- 2. DEĞİŞKENLER ---
let currentPlayer = "X"; // Her zaman X ile başlanır
let oyunBitti = false;
let botAktif = false;
let zorluk = "easy";
let playerSymbol = "X"; // Oyuncunun o maçtaki sembolü
let botSymbol = "O";    // Botun o maçtaki sembolü

const kazanmaYollari = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// --- 3. MENÜ GEÇİŞLERİ ---
document.querySelector('#training-btn').onclick = () => {
    mainButtons.style.display = "none";
    difficultyContainer.style.display = "flex";
};

document.querySelector('#back-to-menu').onclick = () => {
    difficultyContainer.style.display = "none";
    mainButtons.style.display = "flex";
};

// --- RASTGELE KİMLİK ATAMA VE BAŞLATMA ---
const baslat = (m, b, z) => {
    botAktif = b; 
    zorluk = z;
    oyunBitti = false;
    currentPlayer = "X"; // İlk hamle daima X

    // %50 İhtimalle oyuncu mu yoksa rakip mi X (yani ilk başlayan) olacak?
    if (Math.random() < 0.5) {
        playerSymbol = "X";
        botSymbol = "O";
    } else {
        playerSymbol = "O";
        botSymbol = "X";
    }

    menuContainer.style.display = "none";
    gameArea.style.display = "flex";
    
    cells.forEach(c => c.innerText = "");
    restartBtn.style.display = "none";

    // Durum yazısı: Kimin X olduğunu belirtelim
    if (botAktif) {
        statusText.innerText = (playerSymbol === "X") ? "Sıra Sende (X)" : "Bot Başlıyor (X)";
    } else {
        statusText.innerText = "Sıra: X";
    }

    // EĞER BOT X İSE: Hemen hamlesini yapar
    if (botAktif && botSymbol === "X") {
        setTimeout(bot, 800);
    }
};

document.querySelector('#easy-btn').onclick = () => {
    document.querySelector('#back-to-difficulty-btn').style.display = "flex";
    baslat("Acemi Nefer", true, "easy");
};
document.querySelector('#medium-btn').onclick = () => {
    document.querySelector('#back-to-difficulty-btn').style.display = "flex";
    baslat("Kıdemli Çavuş", true, "medium");
};
document.querySelector('#hard-btn').onclick = () => {
    document.querySelector('#back-to-difficulty-btn').style.display = "flex";
    baslat("Sadrazam", true, "hard");
};
document.querySelector('#friend-btn').onclick = () => {
    document.querySelector('#back-to-difficulty-btn').style.display = "none";
    baslat("Paşalar Düellosu", false, "");
};

// --- 4. GERİ DÖNÜŞLER ---
document.querySelector('#game-back-btn').onclick = () => {
    gameArea.style.display = "none";
    menuContainer.style.display = "flex";
    mainButtons.style.display = "flex";
    difficultyContainer.style.display = "none";
};

document.querySelector('#back-to-difficulty-btn').onclick = () => {
    gameArea.style.display = "none";
    menuContainer.style.display = "flex";
    difficultyContainer.style.display = "flex";
};

// --- 5. OYUN MANTIĞI ---
cells.forEach((cell) => {
    cell.onclick = () => {
        // Sadece sıra oyuncunun sembolündeyse tıklamaya izin ver
        if (cell.innerText !== "" || oyunBitti || (botAktif && currentPlayer === botSymbol)) return;
        hamle(cell);
    };
});

function hamle(c) {
    c.innerText = currentPlayer;
    if (kontrol()) {
        statusText.innerText = "Kazanan: " + currentPlayer;
        oyunBitti = true;
        restartBtn.style.display = "block";
    } else if ([...cells].every(cell => cell.innerText !== "")) {
        statusText.innerText = "Beraberlik!";
        oyunBitti = true;
        restartBtn.style.display = "block";
    } else {
        currentPlayer = (currentPlayer === "X") ? "O" : "X";
        statusText.innerText = "Sıra: " + currentPlayer;
        
        // Eğer yeni sıra botun sembolüyse botu çalıştır
        if (botAktif && currentPlayer === botSymbol) setTimeout(bot, 600);
    }
}

// --- 6. ZEKA SİSTEMİ ---
function bot() {
    if (oyunBitti) return;

    let hedefHucre = null;
    let sans = Math.random() * 100;
    let zekaLimiti = (zorluk === "hard") ? 90 : (zorluk === "medium" ? 65 : 45);

    // ADIM 1: MUTLAK GALİBİYET (Bot kendi sembolüyle kazanabiliyor mu?)
    hedefHucre = enIyiHamleyiBul(botSymbol);

    // ADIM 2: SAVUNMA VE STRATEJİ (Bot rakip sembolü engelliyor mu?)
    if (!hedefHucre) {
        if (sans < zekaLimiti) {
            hedefHucre = enIyiHamleyiBul(playerSymbol);
            if (!hedefHucre && zorluk === "hard" && cells[4].innerText === "") {
                hedefHucre = cells[4];
            }
        }
    }

    // ADIM 3: RASTGELE
    if (!hedefHucre) {
        const boslar = [...cells].filter(c => c.innerText === "");
        if (boslar.length > 0) {
            hedefHucre = boslar[Math.floor(Math.random() * boslar.length)];
        }
    }

    if (hedefHucre) hamle(hedefHucre);
}

function enIyiHamleyiBul(sembol) {
    for (let yol of kazanmaYollari) {
        const [a, b, c] = yol;
        const degerler = [cells[a].innerText, cells[b].innerText, cells[c].innerText];
        if (degerler.filter(v => v === sembol).length === 2 && degerler.filter(v => v === "").length === 1) {
            if (cells[a].innerText === "") return cells[a];
            if (cells[b].innerText === "") return cells[b];
            if (cells[c].innerText === "") return cells[c];
        }
    }
    return null;
}

function kontrol() {
    return kazanmaYollari.some(y => cells[y[0]].innerText !== "" && cells[y[0]].innerText === cells[y[1]].innerText && cells[y[0]].innerText === cells[y[2]].innerText);
}

function sifirla() {
    const modMesaji = botAktif ? `Enderûn: ${zorluk}` : "Paşalar Düellosu";
    baslat(modMesaji, botAktif, zorluk);
}
restartBtn.onclick = sifirla;