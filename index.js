const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const PHONE_NUMBER = "27732762976";

async function startNaxora() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "connecting") {
      console.log("🔌 Naxora is connecting...");
    }

    if (connection === "open") {
      console.log("✅ NAXORA AI IS ONLINE!");
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        startNaxora();
      } else {
        console.log("❌ WhatsApp session logged out.");
      }
    }
  });

  if (!state.creds.registered) {
    const code = await sock.requestPairingCode(PHONE_NUMBER);

    console.log("");
    console.log("================================");
    console.log("🔐 NAXORA WHATSAPP PAIRING CODE");
    console.log("================================");
    console.log(code);
    console.log("================================");
    console.log("");
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    if (command === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "🏓 Naxora AI is online!"
      });
    }

    if (command === ".menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text:
`╭───「 NAXORA AI 」───╮
│
│ 🏓 .ping
│ 📋 .menu
│ 🤖 .ai
│
╰────────────────────╯`
      });
    }
  });
}

startNaxora().catch(console.error);
