const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require('fs');

// Fungsi untuk menambahkan delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Antrian untuk pengiriman pesan
const messageQueue = [];
let messageCounter = 0; // Menghitung pesan terkirim dalam 1 menit

// Fungsi untuk memproses antrian pesan
function processQueue(sock) {
    if (messageCounter >= 20) return; // Batasi 20 pesan per menit

    const message = messageQueue.shift(); // Ambil pesan pertama dari antrian
    if (message) {
        const { recipient, content } = message;
        sock.sendMessage(recipient, content)
            .then(() => {
                console.log('Message sent:', content);
                messageCounter++;
            })
            .catch(err => console.log('Failed to send message:', err));
    }
}

// Fungsi utama
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close' && lastDisconnect) {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        console.log(JSON.stringify(m, undefined, 2));

        const groupID = "120363373250080918@g.us"; // ID grup
        const personalNumber = `6282291786044@c.us`; // Nomor pribadi

        // Tambahkan pesan ke antrian
        messageQueue.push(
            { recipient: groupID, content: { text: 'Hello to group!' } },
            { recipient: groupID, content: { image: fs.readFileSync('images.jpg'), caption: 'Hello from the group!' } },
            { recipient: groupID, content: { video: fs.readFileSync('ma_gif.mp4'), caption: 'Video from group!', gifPlayback: true } },
            { recipient: personalNumber, content: { text: 'Hello to personal!' } },
            { recipient: personalNumber, content: { image: fs.readFileSync('images.jpg'), caption: 'Hello from personal message!' } },
            { recipient: personalNumber, content: { video: fs.readFileSync('ma_gif.mp4'), caption: 'Video from personal message!', gifPlayback: true } }
        );
    });

    // Proses antrian setiap 3 detik (20 pesan per menit = 1 pesan setiap 3 detik)
    setInterval(() => processQueue(sock), 3000);

    // Reset penghitung pesan setiap menit
    setInterval(() => {
        messageCounter = 0;
        console.log('Message counter reset.');
    }, 60000);
}

// Jalankan fungsi utama
connectToWhatsApp();
