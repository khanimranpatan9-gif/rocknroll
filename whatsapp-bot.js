const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');

const AUTH_DIR = path.join(__dirname, 'data', 'auth_baileys');
const GROUP_INVITE_CODE = 'F1DKNCYNeMg3o2h9boHTdy';
const TARGET_GROUP_NAME = 'Rock on Roll payment';

let sock = null;
let botState = {
  status: 'initializing', // 'initializing' | 'qr_ready' | 'connected' | 'reconnecting' | 'disconnected'
  qr: null,
  user: null,
  groupJid: null,
  groupName: TARGET_GROUP_NAME,
  lastError: null,
  updatedAt: new Date().toISOString()
};

async function connectToWhatsApp() {
  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Rock N Rolls Kitchen', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          botState.status = 'qr_ready';
          botState.qr = dataUrl;
          botState.updatedAt = new Date().toISOString();
          console.log('\n[WHATSAPP BOT] 📱 New QR Code ready! Scan from Admin Portal (/admin) or Settings -> Linked Devices.');
        } catch (e) {
          console.error('[WHATSAPP BOT] Failed to generate QR data URL:', e);
        }
      }

      if (connection === 'open') {
        botState.status = 'connected';
        botState.qr = null;
        botState.user = sock.user;
        botState.updatedAt = new Date().toISOString();
        console.log(`\n======================================================`);
        console.log(`[WHATSAPP BOT] 🟢 CONNECTED TO WHATSAPP!`);
        console.log(`Logged in as: ${sock.user?.name || sock.user?.id}`);
        console.log(`======================================================\n`);

        // Find or join the "Rock on Roll payment" group
        resolveTargetGroup();
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason?.loggedOut;
        console.log(`[WHATSAPP BOT] ⚠️ Connection closed. Code: ${statusCode}. Logged out? ${isLoggedOut}`);

        if (isLoggedOut) {
          botState.status = 'disconnected';
          botState.qr = null;
          botState.user = null;
          botState.groupJid = null;
          botState.lastError = 'Logged out. Please scan QR again.';
          // Clear auth dir
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch(e) {}
          setTimeout(connectToWhatsApp, 3000);
        } else {
          botState.status = 'reconnecting';
          setTimeout(connectToWhatsApp, 5000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    console.error('[WHATSAPP BOT] Initialization error:', err);
    botState.status = 'disconnected';
    botState.lastError = err.message;
    setTimeout(connectToWhatsApp, 6000);
  }
}

async function resolveTargetGroup() {
  if (!sock) return;

  // Attempt 1: Fetch via invite code
  try {
    const inviteInfo = await sock.groupGetInviteInfo(GROUP_INVITE_CODE);
    if (inviteInfo && inviteInfo.id) {
      botState.groupJid = inviteInfo.id;
      botState.groupName = inviteInfo.subject || TARGET_GROUP_NAME;
      console.log(`[WHATSAPP BOT] Target group identified via invite: ${botState.groupName} (${botState.groupJid})`);

      // Ensure bot joins if not already a member
      try {
        await sock.groupAcceptInvite(GROUP_INVITE_CODE);
        console.log(`[WHATSAPP BOT] Joined group ${botState.groupName}!`);
      } catch (err) {
        // Already a member or invite accepted
      }
      return;
    }
  } catch (err) {
    console.log(`[WHATSAPP BOT] Note: groupGetInviteInfo check: ${err.message || 'Already in group'}`);
  }

  // Attempt 2: Search participating groups
  try {
    const participating = await sock.groupFetchAllParticipating();
    for (const [jid, meta] of Object.entries(participating)) {
      if (meta.subject && meta.subject.toLowerCase().includes('rock on roll')) {
        botState.groupJid = jid;
        botState.groupName = meta.subject;
        console.log(`[WHATSAPP BOT] Found matching group in participating list: ${meta.subject} (${jid})`);
        return;
      }
    }
    // If not found by keyword, log all participating groups
    console.log('[WHATSAPP BOT] Available groups:', Object.values(participating).map(g => g.subject));
  } catch (err) {
    console.warn('[WHATSAPP BOT] Error searching participating groups:', err.message);
  }
}

function formatOrderReceipt(order) {
  let msg = `🔥 *ROCK ON ROLL PAYMENT - NEW ORDER* 🔥\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *Order ID:* ${order.orderId}\n`;
  if (order.customerName) msg += `👤 *Customer Name:* ${order.customerName}\n`;
  if (order.customerPhone) msg += `📞 *Customer Mobile:* +91 ${order.customerPhone}\n`;
  msg += `⏰ *Order Time:* ${order.date || 'Today'}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🍴 *ITEMS TO PREPARE:*\n`;

  if (order.itemList && Array.isArray(order.itemList) && order.itemList.length > 0) {
    order.itemList.forEach(item => {
      const portionStr = item.portion ? ` (${item.portion})` : '';
      const addonStr = (item.addons && item.addons.length > 0) ? ` [Addons: ${item.addons.join(', ')}]` : '';
      msg += `• *${item.quantity}x ${item.name}*${portionStr}${addonStr} — ₹${item.total || (item.price * item.quantity)}\n`;
    });
  } else {
    msg += `• *${order.items}* — ₹${order.total}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (order.instructions && order.instructions.trim()) {
    msg += `🍳 *Special Cooking Notes:* ${order.instructions.trim()}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }
  msg += `💳 *Payment Method:* ${order.paymentMethod || 'UPI'}\n`;
  if (order.utr) msg += `🔢 *Transaction ID:* ${order.utr} (Auto-Captured)\n`;
  msg += `🛡️ *Payment Status:* ✅ PAID & CONFIRMED (₹${order.total})\n`;
  msg += `⭐️ *TOTAL BILL:* ₹${order.total} (Zero extra packaging/tax)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 *AUTO-DISPATCHED TO ADMIN GROUP:* Rock on Roll payment 🚀\n`;
  msg += `Kitchen Staff: Please acknowledge & start live prep!`;
  return msg;
}

async function sendOrderToGroup(order) {
  if (botState.status !== 'connected' || !sock) {
    console.log('[WHATSAPP BOT] Cannot auto-send: Bot is not connected yet.');
    return { success: false, reason: 'bot_not_connected', botState };
  }

  // If groupJid not yet stored, re-check
  if (!botState.groupJid) {
    await resolveTargetGroup();
  }

  if (!botState.groupJid) {
    console.error('[WHATSAPP BOT] Target group JID not found. Cannot post message.');
    return { success: false, reason: 'group_not_found', botState };
  }

  const receiptText = formatOrderReceipt(order);

  try {
    const result = await sock.sendMessage(botState.groupJid, { text: receiptText });
    console.log(`\n======================================================`);
    console.log(`[WHATSAPP BOT] ✅ 100% AUTO-POSTED TO GROUP: ${botState.groupName}!`);
    console.log(`Order ID: ${order.orderId} | Message ID: ${result?.key?.id}`);
    console.log(`======================================================\n`);
    return {
      success: true,
      messageId: result?.key?.id,
      groupJid: botState.groupJid,
      groupName: botState.groupName
    };
  } catch (err) {
    console.error(`[WHATSAPP BOT] ❌ Failed to send message to group ${botState.groupJid}:`, err);
    return { success: false, reason: err.message };
  }
}

function getBotStatus() {
  return botState;
}

// Start bot
connectToWhatsApp();

module.exports = {
  getBotStatus,
  sendOrderToGroup,
  connectToWhatsApp
};
