const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const readline = require("readline");

const config = require("./config");

async function startNaxora() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("Enter your WhatsApp number (e.g. 27732762976): ", async (number) => {
      number = number.replace(/\D/g, "");

      try {
        const code = await sock.requestPairingCode(number);
        console.log("\n🔐 NAXORA PAIRING CODE:");
        console.log(code);
        console.log("\nOpen WhatsApp → Linked Devices → Link a device → Link with phone number");
      } catch (error) {
        console.error("Pairing error:", error);
      }

      rl.close();
    });
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ NAXORA AI CONNECTED!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        startNaxora();
      } else {
        console.log("❌ Logged out. Delete the auth folder and pair again.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const message = messages[0];

    if (!message.message || message.key.fromMe) return;

    const text =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === ".ping") {
      await sock.sendMessage(message.key.remoteJid, {
        text: "🏓 Naxora AI is online!"
      });
    }

    if (text.toLowerCase() === ".menu") {
      await sock.sendMessage(message.key.remoteJid, {
        text:
`╭───「 NAXORA AI 」───╮
│
│ 🏓 .ping
│ 📋 .menu
│ 🤖 .ai hello
│
╰──────────────────╯`
      });
    }
  });
}

startNaxora();
