const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const P = require("pino");
const config = require("./config");

async function pair() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    const code = await sock.requestPairingCode(config.owner);

    console.log("================================");
    console.log("🔐 NAXORA WHATSAPP PAIRING CODE");
    console.log(code);
    console.log("================================");
  } else {
    console.log("✅ WhatsApp is already paired.");
  }
}

pair();
