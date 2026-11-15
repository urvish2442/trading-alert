const webpush = require("web-push");
const fs = require("fs");
const path = require("path");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("Generated VAPID Keys:");
console.log("Public Key: ", vapidKeys.publicKey);
console.log("Private Key:", vapidKeys.privateKey);

const envLocalPath = path.resolve(process.cwd(), ".env.local");
let content = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, "utf8") : "";

if (!content.includes("VAPID_PUBLIC_KEY")) {
  const vapidBlock = `
# ------------------------------------------------------------------------------
# WEB PUSH NOTIFICATIONS (VAPID)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@trading.local
`;
  fs.appendFileSync(envLocalPath, vapidBlock);
  console.log("Appended VAPID keys to .env.local!");
} else {
  console.log("VAPID keys already exist in .env.local!");
}

