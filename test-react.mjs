import { generateWAMessage } from '@whiskeysockets/baileys';
const m = generateWAMessage("status@broadcast", { react: { text: "💚", key: { remoteJid: "status@broadcast", id: "123", participant: "user@s.whatsapp.net" } } }, { userJid: "me@s.whatsapp.net", upload: () => {} });
console.log(JSON.stringify(m, null, 2));
