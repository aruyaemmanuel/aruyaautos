import businessInfo from './business_info.json';
import menuData from './menu.json';
import { memory } from './memory';
/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

export interface ServiceDetail {
  title: string;
  description: string;
}

interface MenuItem {
  name: string;
  description?: string;
  available?: boolean;
  price?: number;
  pricePerUnit?: number;
  unit?: string;
}

interface MenuCategory {
  categoryName: string;
  items: MenuItem[];
}

interface MenuData {
  currencySymbol: string;
  restaurantName: string;
  pricingModel?: { note?: string };
  categories: MenuCategory[];
}

// Cast once so TypeScript doesn't choke on heterogeneous JSON item shapes
const menu = menuData as unknown as MenuData;

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const CAPTION_LIMIT = 1024; // Telegram photo caption limit
const MESSAGE_LIMIT = 4096; // Telegram text message limit
const CHUNK_SIZE = 3800; // safe margin under MESSAGE_LIMIT

/** Escape text before putting it inside HTML parse_mode messages. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function errMsg(error: unknown): string {
  const e = error as { message?: string } | undefined;
  return e?.message || String(error);
}

/** Split long text on line boundaries so each piece fits in one message. */
function chunkText(text: string, size: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > size && current) {
      chunks.push(current.trimEnd());
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) chunks.push(current.trimEnd());

  return chunks.length ? chunks : [''];
}






/**
 * Single low-level Telegram call. Always checks `ok` and logs the reason.
 * Logs strings only (avoids the SWC WASM error-reporter crash in Termux).
 */

async function telegramCall(
  token: string,
  method: string,
  payload: Record<string, any>
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();
    if (!data.ok) {
      console.error(`[Telegram API Error - ${method}]: ${data.description}`);
    }
    return Boolean(data.ok);
  } catch (error) {
    console.error(`[Telegram Exception - ${method}]: ${errMsg(error)}`);
    return false;
  }
}


async function sendLongHtml(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: Record<string, any>
): Promise<void> {
  const chunks = chunkText(text);

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await sendMessage(token, chatId, chunks[i].slice(0, MESSAGE_LIMIT), {
      parse_mode: 'HTML',
      ...(isLast && replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }
}

/** Sends a photo with a SHORT caption. Returns false if it fails. */
async function sendPhoto(
  token: string,
  chatId: number,
  photoUrl: string | undefined,
  caption: string,
  extraOptions: Record<string, any> = {}
): Promise<boolean> {
  if (!photoUrl) return false;

  return telegramCall(token, 'sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption.slice(0, CAPTION_LIMIT),
    parse_mode: 'HTML',
    ...extraOptions,
  });
}






/* ------------------------------------------------------------------ */
/* Static service details                                              */
/* ------------------------------------------------------------------ */

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  business_info: {
    title: 'ℹ️ About Chowry',
    description: esc(businessInfo.overview),
  },
  browse_menu: {
    title: '🍽️ Browse Menu',
    description:
      'Explore our delicious offerings:\n• Jollof Rice & Turkey/Chicken\n• Fried Rice & Sides\n• White Rice & Stew\n\n' +
      esc(businessInfo.pricing.startingPrice) +
      '.',
  },
  track_order: {
    title: '📦 Track Order',
    description:
      'Please reply with your Order ID or chat directly with support to get real-time updates on your delivery status.',
  },
  contact_support: {
    title: '💬 Speak to Support',
    description:
      'Need help with an order or have special dietary requests? Our support team is ready to assist you via WhatsApp or Telegram.',
  },
};





/* ------------------------------------------------------------------ */
/* Low-level Telegram API wrappers                                     */
/* ------------------------------------------------------------------ */

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  extraOptions: Record<string, any> = {}
): Promise<boolean> {
  return telegramCall(token, 'sendMessage', {
    chat_id: chatId,
    text,
    ...extraOptions,
  });
}

export async function editMessageText(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  extraOptions: Record<string, any> = {}
): Promise<boolean> {
  return telegramCall(token, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...extraOptions,
  });
}



export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string
): Promise<boolean> {
  return telegramCall(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
  });
}







/* ------------------------------------------------------------------ */
/* High-level views                                                    */
/* ------------------------------------------------------------------ */


// get business info upon request to understand business.
export async function getBusinessInfo(
  botToken: string,
  chatId: number,
  _topic?: string
): Promise<void> {
  try {
    const servicesList = businessInfo.services
      .map((s) => `• <b>${esc(s.name)}</b>\n  ${esc(s.description)}`)
      .join('\n\n');

    const businessMessage = `
${esc(businessInfo.overview)}

<b>Our Core Services:</b>
${servicesList}

💰 <b>Pricing:</b> ${esc(businessInfo.pricing.startingPrice)}.

${esc(businessInfo.cta.message)}
    `.trim();

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🍽️ Browse Menu', callback_data: 'browse_menu' },
          { text:​'Place Order' , callback_data: 'order:start' },
        ],
        [{ text: 'Main Menu', callback_data: 'menu:main' }],
      ],
    };

    await sendLongHtml(botToken, chatId, businessMessage, replyMarkup);
  } catch (error) {
    console.error(`[getBusinessInfo Exception]: ${errMsg(error)}`);
  }
}


// gets the menu upon request to browse menu
export async function getMenuInfo(botToken: string, chatId: number): Promise<void> {
  try {
    const { currencySymbol, restaurantName, categories, pricingModel } = menu;

    let menuText = `🍽️ <b>${esc(restaurantName)} - Complete Menu &amp; Availability</b>\n\n`;

    if (pricingModel?.note) {
      menuText += `💡 <i>${esc(pricingModel.note)}</i>\n\n`;
    }

    categories.forEach((category) => {
      menuText += `<b>📂 ${esc(category.categoryName)}</b>\n`;

      category.items.forEach((item) => {
        const statusBadge = item.available ? '🟢 Available' : '🔴 [Sold Out]';

        const priceDisplay = item.pricePerUnit
          ? `${currencySymbol}${item.pricePerUnit.toLocaleString()} / ${esc(item.unit)}`
          : item.price
          ? `${currencySymbol}${item.price.toLocaleString()}`
          : '';

        menuText += `• <b>${esc(item.name)}</b> — ${priceDisplay} | ${statusBadge}\n`;
        if (item.description) {
          menuText += `  <i>${esc(item.description)}</i>\n`;
        }
      });

      menuText += '\n';
    });

    menuText +=
      '💬 <i>To order, simply type what you want in the chat (e.g., "I want 3 spoons of jollof rice and turkey") and our assistant will handle it!</i>';

          const replyMarkup = {
      inline_keyboard: [
        [
          { text: '​Place Order', callback_data: 'order:start' },
          { text: 'Track Order', callback_data: 'track_order'}
        ],
        [
          { text: 'Main Menu', callback_data: 'menu:main' }
        ]
      ]
    };
    
    await sendLongHtml(botToken, chatId, menuText.trim(), replyMarkup);
  } catch (error) {
    console.error(`[getMenuInfo Exception]: ${errMsg(error)}`);
  }
}

/**
 * Sends the main menu along with the Chowry flyer image from businessInfo.
 */
export async function sendMainMenu(
  botToken: string,
  chatId: number,
  userName: string
): Promise<void> {
  const caption = `Hey ${esc(
    userName
  )}! Welcome to Chowry 🍔\n\nFresh, fast food delivered right to your doorstep. Choose an option below or tell me what you'd like to order:`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'ℹ️ About Us', callback_data: 'business_info' }],
      [{ text: '🍽️ Browse Menu', callback_data: 'browse_menu' }],
      [{ text: '📦 Track Order', callback_data: 'track_order' }],
      [{ text: '💬 Speak to Support', callback_data: 'contact_support' }],
    ],
  };

  try {
    const sent = await sendPhoto(botToken, chatId, businessInfo.mainMenuUrl, caption, {
      reply_markup: replyMarkup,
    });

    // Fallback: if the photo fails (bad URL etc.), still show the menu as text
    if (!sent) {
      await sendMessage(botToken, chatId, caption, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    console.error(`[sendMainMenu Exception]: ${errMsg(error)}`);
  }
}




// Helper function in apihandlers.ts
export async function promptAddressStep(botToken: string, chatId: number) {
  const keyboard = {
    keyboard: [
      [{ text: "📍 Share Current Location", request_location: true }],
      [{ text: "✍️ Type Address Manually" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await sendMessage(
    botToken,
    chatId,
    "📍 <b>Where should we deliver your food?</b>\n\nTap the button below to share your current location, or type out a different delivery address!",
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}



export async function renderServiceDetail(
  token: string,
  chatId: number,
  serviceKey: string,
  _messageId?: number
): Promise<boolean> {
  const cleanKey = serviceKey.replace('service:', '');
  const service = SERVICE_DETAILS[cleanKey] || {
    title: 'Service Information',
    description: 'Contact us directly to discuss custom requirements.',
  };

  const text =
    `<b>${service.title}</b>\n\n` +
    `${service.description}\n\n` +
    `<i>Would you like to place an order or talk to us?</i>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Chat on WhatsApp', url: businessInfo.cta.links.whatsapp }],
      [{ text: '⬅️ Back to Main Menu', callback_data: 'menu:main' }],
    ],
  };

  console.log("this api is still relevant")

  // Fresh message avoids Telegram photo-editing conflicts
  return sendMessage(token, chatId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function recordInquiryConfirmation(
  token: string,
  chatId: number,
  _serviceKey: string,
  _messageId?: number
): Promise<boolean> {
  const confirmationText =
    `✅ <b>Support Request Received!</b>\n\n` +
    `Thank you for reaching out. Our support team will connect with you shortly.`;

  const keyboard = {
    inline_keyboard: [[{ text: '⬅️ Back to Main Menu', callback_data: 'menu:main' }]],
  };

  return sendMessage(token, chatId, confirmationText, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}




export async function promptPhoneStep(botToken: string, chatId: number) {
  const keyboard = {
    keyboard: [
      [{ text: "📱 Share Phone Number", request_contact: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await sendMessage(
    botToken,
    chatId,
    "📱 <b>What phone number can the delivery rider reach you on?</b>\n\nTap below to share your contact number or type it out.",
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
}


export async function processShippingAndTotal(botToken: string, chatId: number) {
  const order = memory.getOrderState(chatId);
  
  // Calculate delivery fee (e.g. zone lookup or logistics API estimation)
  const deliveryFee = 1000; // Example flat/calculated logistics fee
  const grandTotal = order.subtotal + deliveryFee;

  memory.updateOrderState(chatId, {
    delivery: { ...order.delivery, deliveryFee },
    grandTotal,
    step: 'confirming_order'
  });

  // Proceed directly to the final summary card
  await showFinalOrderCard(botToken, chatId);
}

export async function showFinalOrderCard(botToken: string, chatId: number) {
  const order = memory.getOrderState(chatId);

  const itemsList = order.items
    .map(i => `• ${i.quantity}x ${i.name} (₦${i.totalPrice.toLocaleString()})`)
    .join('\n');

  const messageText = `
🧾 <b>ORDER CONFIRMATION</b>
━━━━━━━━━━━━━━━━━━
${itemsList}

<b>Food Subtotal:</b> ₦${order.subtotal.toLocaleString()}
<b>Delivery Fee:</b> ₦${order.delivery.deliveryFee?.toLocaleString()}
<b>Grand Total:</b> ₦${order.grandTotal.toLocaleString()}

📍 <b>Deliver To:</b> ${order.delivery.address}
📱 <b>Phone:</b> ${order.delivery.phone}
━━━━━━━━━━━━━━━━━━
Does everything look correct?
  `.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: "💳 Proceed to Payment", callback_data: "order:pay" }],
      [{ text: "✏️ Edit Items", callback_data: "order:edit_cart" }, { text: "📍 Edit Address", callback_data: "order:edit_address" }],
      [{ text: "❌ Cancel Order", callback_data: "order:cancel" }]
    ]
  };

  await sendMessage(botToken, chatId, messageText, {
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard
  });
}
