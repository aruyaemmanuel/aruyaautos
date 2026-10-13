// import Groq from 'groq-sdk';
// import menuData from './menu.json';
// import businessInfo from './business_info.json';
// import { agentTools } from './tools';
// import { memory } from './memory';
// import {
//   renderServiceDetail,
//   recordInquiryConfirmation,
//   sendMainMenu,
//   sendMessage,
//   getBusinessInfo,
//   getMenuInfo,
//   promptAddressStep,
//   promptPhoneStep,
//   processShippingAndTotal,
// } from './apihandlers';

// /**
//  * Sanitizes output to prevent Telegram HTML parsing crashes.
//  * Telegram's HTML mode rejects tags like <ul>, <ol>, <li>, and <br>.
//  */
// function sanitizeTelegramHtml(html: string): string {
//   return html
//     .replace(/<\/?(ul|ol|li)>/gi, '')
//     .replace(/<br\s*\/?>/gi, '\n');
// }

// export class LLMHandler {
//   private groq: Groq;
//   private botToken: string;
//   private model: string;

//   constructor(
//     groqApiKey: string,
//     botToken: string,
//     model = 'openai/gpt-oss-120b'
//   ) {
//     this.groq = new Groq({ apiKey: groqApiKey });
//     this.botToken = botToken;
//     this.model = model;
//   }

//   /**
//    * Processes incoming user messages to handle orders, menu queries, and support.
//    */
//   async handleUserMessage(
//     chatId: number,
//     senderName: string,
//     text: string
//   ): Promise<void> {
//     // 1. Fetch conversation history and order lifecycle state from ShortTermMemory
//     const history = memory.getHistory(chatId);
//     const orderState = memory.getOrderState(chatId);

//     const systemPrompt = `You are Chowry's friendly, warm, and helpful AI food assistant. Your primary job is to make ordering delicious meals effortless and enjoyable.

// Restaurant Info:
// ${JSON.stringify(businessInfo, null, 2)}

// Live Menu Catalog & Pricing Rules:
// ${JSON.stringify(menuData, null, 2)}

// Current Order Lifecycle State in Memory:
// ${JSON.stringify(orderState, null, 2)}

// Key Guidelines for Customer Responses:
// 1. Tone & Formatting:
//    - Be exceptionally warm, polite, and enthusiastic. Use light emojis (😋, 🍲, 📦, ✨).
//    - Use ONLY supported Telegram HTML tags: <b>bold</b>, <i>italics</i>, <code>code</code>, or <a href="...">links</a>.
//    - NEVER output <ul>, <ol>, <li>, or <br> tags.
//    - Present itemized receipts using literal bullet characters (•) and plain line breaks.

// 2. Order Calculations:
//    - All rice portions cost ₦600 per spoon unless explicitly specified otherwise in menuData.
//    - Proteins, drinks, and sides use their flat prices listed in menuData.
//    - Always display an explicit breakdown before giving the total (e.g., • 2x Spoons Jollof Rice: ₦1,200).

// 3. Checkout & Lifecycle Flow:
//    - Step 'cart':
//      * Help them build their order items using updateOrderState.
//      * When an itemized breakdown is confirmed by the user (e.g., user replies "yes", "confirm", "proceed", "yep", "ok", "looks good"), IMMEDIATELY trigger the tool "promptAddressStep" to request their delivery address.
//    - Step 'awaiting_address':
//      * Once the user provides or confirms their address or GPS location, trigger the tool "promptPhoneStep".
//    - Step 'awaiting_phone':
//      * Once the user provides their contact number, trigger the tool "processShippingAndTotal".
//    - Do NOT ask them to sign up, log in, or create an account.

// 4. Sold-Out Items:
//    - Check item availability ("available: false"). If an item isn't ready, politely inform the user and suggest a popular alternative.

// 5. Tool Usage:
//    - Trigger showMenu if the customer explicitly requests the full catalog or visual menu.
//    - Trigger showMainMenu if they ask to go back to the main menu.
//    - Trigger updateOrderState whenever items are added/modified.
//    - Trigger promptAddressStep when transitioning from cart confirmation to address collection.
//    - Trigger promptPhoneStep when transitioning to phone collection.
//    - Trigger processShippingAndTotal to compute shipping fees and display the final checkout card.`;

//     const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
//       { role: 'system', content: systemPrompt },
//       ...history,
//       { role: 'user', content: `[User: ${senderName}] ${text}` },
//     ];

//     try {
//       // 2. Send typing indicator to Telegram UI
//       await fetch(`https://api.telegram.org/bot${this.botToken}/sendChatAction`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
//       });

//       // 3. Query Groq completion
//       const response = await this.groq.chat.completions.create({
//         model: this.model,
//         messages,
//         tools: agentTools,
//         tool_choice: 'auto',
//       });

//       const responseMessage = response.choices[0].message;

//       // 4. Process tool/function calls if requested by LLM
//       if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
//         for (const toolCall of responseMessage.tool_calls) {
//           const fnName = toolCall.function.name;
//           console.log('function of choice:', fnName);

//           let args: Record<string, any> = {};
//           try {
//             args = toolCall.function.arguments
//               ? JSON.parse(toolCall.function.arguments)
//               : {};
//           } catch (e: any) {
//             console.error('Failed to parse tool call arguments:', e?.message || String(e));
//           }

//           if (fnName === 'getBusinessInfo') {
//             await getBusinessInfo(this.botToken, chatId, args.topic || 'business_info');
//           } else if (fnName === 'showMenu' || fnName === 'browseMenu') {
//             await getMenuInfo(this.botToken, chatId);
//           } else if (fnName === 'showMainMenu') {
//             await sendMainMenu(this.botToken, chatId, args.userName || senderName);
//           } else if (fnName === 'showServiceInfo') {
//             await renderServiceDetail(this.botToken, chatId, args.serviceKey);
//           } else if (fnName === 'bookConsultation') {
//             await recordInquiryConfirmation(this.botToken, chatId, args.serviceKey);
//           } else if (fnName === 'updateOrderState') {
//             const updatedItems = args.items || orderState.items;
//             const updatedStep = args.step || orderState.step;

//             memory.updateOrderState(chatId, {
//               items: updatedItems,
//               step: updatedStep,
//             });
//             memory.logSession(chatId);

//             const currentSubtotal = updatedItems.reduce(
//               (acc: number, item: any) => acc + (item.totalPrice || 0),
//               0
//             );

//             const receiptLines = updatedItems
//               .map((item: any) => `• <b>${item.quantity}x ${item.name}</b> — ₦${item.totalPrice?.toLocaleString()}`)
//               .join('\n');

//             const replyText =
//               `Here’s your tasty lineup so far, ${senderName} 🍲:\n\n` +
//               `${receiptLines}\n\n` +
//               `<b>Subtotal:</b> ₦${currentSubtotal.toLocaleString()}\n\n` +
//               `Everything looks delicious! 👍\n` +
//               `Just reply <b>"yes"</b> to confirm this order and we’ll move on to your delivery address, or let me know if you’d like to add or change anything.`;

//             await sendMessage(this.botToken, chatId, replyText, { parse_mode: 'HTML' });
//             memory.addTurn(chatId, text, replyText);
//           } else if (fnName === 'promptAddressStep') {
//             memory.updateOrderState(chatId, { step: 'awaiting_address' });
//             memory.logSession(chatId);
//             await promptAddressStep(this.botToken, chatId);
//           } else if (fnName === 'promptPhoneStep') {
//             memory.updateOrderState(chatId, { step: 'awaiting_phone' });
//             memory.logSession(chatId);
//             await promptPhoneStep(this.botToken, chatId);
//           } else if (fnName === 'processShippingAndTotal') {
//             memory.updateOrderState(chatId, { step: 'calculating_shipping' });
//             memory.logSession(chatId);
//             await processShippingAndTotal(this.botToken, chatId);
//           }
//         }
//         return;
//       }

//       // 5. Send textual response and store interaction turn in memory
//       if (responseMessage.content) {
//         const safeText = sanitizeTelegramHtml(responseMessage.content);
//         await sendMessage(this.botToken, chatId, safeText, {
//           parse_mode: 'HTML',
//         });

//         // Save turn to RAM sliding memory and log session state
//         memory.addTurn(chatId, text, safeText);
//         memory.logSession(chatId);
//       }
//     } catch (error: any) {
//       const errorMessage = error?.message || String(error);
//       console.error('[Chowry LLM Agent Exception]:', errorMessage);

//       await sendMessage(
//         this.botToken,
//         chatId,
//         "Oops! I had a quick hiccup processing that. 🍲\n\nCould you rephrase your request, or tap <b>Browse Menu</b> below to check our offerings?",
//         { parse_mode: 'HTML' }
//       );
//     }
//   }
// }


import Groq from 'groq-sdk';
import menuData from './menu.json';
import businessInfo from './business_info.json';
import { agentTools } from './tools';
import { memory } from './memory';
import {
  renderServiceDetail,
  recordInquiryConfirmation,
  sendMainMenu,
  sendMessage,
  getBusinessInfo,
  getMenuInfo,
  promptAddressStep,
  promptPhoneStep,
  processShippingAndTotal,
} from './apihandlers';

/**
 * Sanitizes output to prevent Telegram HTML parsing crashes.
 * Telegram's HTML mode rejects tags like <ul>, <ol>, <li>, and <br>.
 */
function sanitizeTelegramHtml(html: string): string {
  return html
    .replace(/<\/?(ul|ol|li)>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');
}

export class LLMHandler {
  private groq: Groq;
  private botToken: string;
  private model: string;

  constructor(
    groqApiKey: string,
    botToken: string,
    model = 'openai/gpt-oss-120b'
  ) {
    this.groq = new Groq({ apiKey: groqApiKey });
    this.botToken = botToken;
    this.model = model;
  }

  /**
   * Processes incoming user messages to handle orders, menu queries, and support.
   */
  async handleUserMessage(
    chatId: number,
    senderName: string,
    text: string
  ): Promise<void> {
    // 1. Fetch conversation history and order lifecycle state from ShortTermMemory
    const history = memory.getHistory(chatId);
    const orderState = memory.getOrderState(chatId);

    // Deterministic interception for cart confirmation to prevent loopbacks/friction
    const lowerText = text.toLowerCase().trim();
    if (
      orderState.step === 'cart' &&
      ['yes', 'yep', 'ok', 'sure', 'confirm', 'proceed', 'y'].includes(lowerText)
    ) {
      memory.updateOrderState(chatId, { step: 'awaiting_address' });
      memory.logSession(chatId);
      await promptAddressStep(this.botToken, chatId);
      return;
    }

    const systemPrompt = `You are Chowry's friendly, warm, and helpful AI food assistant. Your primary job is to make ordering delicious meals effortless and enjoyable.

Restaurant Info:
${JSON.stringify(businessInfo, null, 2)}

Live Menu Catalog & Pricing Rules:
${JSON.stringify(menuData, null, 2)}

Current Order Lifecycle State in Memory:
${JSON.stringify(orderState, null, 2)}

Key Guidelines for Customer Responses:
1. Tone & Formatting:
   - Be exceptionally warm, polite, and enthusiastic. Use light emojis (😋, 🍲, 📦, ✨).
   - Use ONLY supported Telegram HTML tags: <b>bold</b>, <i>italics</i>, <code>code</code>, or <a href="...">links</a>.
   - NEVER output <ul>, <ol>, <li>, or <br> tags.
   - Present itemized receipts using literal bullet characters (•) and plain line breaks.

2. Order Calculations:
   - All rice portions cost ₦600 per spoon unless explicitly specified otherwise in menuData.
   - Proteins, drinks, and sides use their flat prices listed in menuData.
   - Always display an explicit breakdown before giving the total (e.g., • 2x Spoons Jollof Rice: ₦1,200).

3. Checkout & Lifecycle Flow:
   - Step 'cart':
     * Help them build their order items using updateOrderState.
     * When an itemized breakdown is confirmed by the user, transition to address collection.
   - Step 'awaiting_address':
     * Once the user provides or confirms their address or GPS location, trigger the tool "promptPhoneStep".
   - Step 'awaiting_phone':
     * Once the user provides their contact number, trigger the tool "processShippingAndTotal".
   - Do NOT ask them to sign up, log in, or create an account.

4. Sold-Out Items:
   - Check item availability ("available: false"). If an item isn't ready, politely inform the user and suggest a popular alternative.

5. Tool Usage:
   - Trigger showMenu if the customer explicitly requests the full catalog or visual menu.
   - Trigger showMainMenu if they ask to go back to the main menu.
   - Trigger updateOrderState whenever items are added/modified.
   - Trigger promptAddressStep when transitioning from cart confirmation to address collection.
   - Trigger promptPhoneStep when transitioning to phone collection.
   - Trigger processShippingAndTotal to compute shipping fees and display the final checkout card.`;

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: `[User: ${senderName}] ${text}` },
    ];

    try {
      // 2. Send typing indicator to Telegram UI
      await fetch(`https://api.telegram.org/bot${this.botToken}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      });

      // 3. Query Groq completion
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages,
        tools: agentTools,
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;

      // 4. Process tool/function calls if requested by LLM
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        for (const toolCall of responseMessage.tool_calls) {
          const fnName = toolCall.function.name;
          console.log('function of choice:', fnName);

          let args: Record<string, any> = {};
          try {
            args = toolCall.function.arguments
              ? JSON.parse(toolCall.function.arguments)
              : {};
          } catch (e: any) {
            console.error('Failed to parse tool call arguments:', e?.message || String(e));
          }

          if (fnName === 'getBusinessInfo') {
            await getBusinessInfo(this.botToken, chatId, args.topic || 'business_info');
          } else if (fnName === 'showMenu' || fnName === 'browseMenu') {
            await getMenuInfo(this.botToken, chatId);
          } else if (fnName === 'showMainMenu') {
            await sendMainMenu(this.botToken, chatId, args.userName || senderName);
          } else if (fnName === 'showServiceInfo') {
            await renderServiceDetail(this.botToken, chatId, args.serviceKey);
          } else if (fnName === 'bookConsultation') {
            await recordInquiryConfirmation(this.botToken, chatId, args.serviceKey);
          } else if (fnName === 'updateOrderState') {
            const updatedItems = args.items || orderState.items;
            const updatedStep = args.step || orderState.step;

            memory.updateOrderState(chatId, {
              items: updatedItems,
              step: updatedStep,
            });
            memory.logSession(chatId);

            const currentSubtotal = updatedItems.reduce(
              (acc: number, item: any) => acc + (item.totalPrice || 0),
              0
            );

            const receiptLines = updatedItems
              .map((item: any) => `• <b>${item.quantity}x ${item.name}</b> — ₦${item.totalPrice?.toLocaleString()}`)
              .join('\n');

            const replyText =
              `Here’s your tasty lineup so far, ${senderName} 🍲:\n\n` +
              `${receiptLines}\n\n` +
              `<b>Subtotal:</b> ₦${currentSubtotal.toLocaleString()}\n\n` +
              `Everything looks delicious! 👍\n` +
              `Just reply <b>"yes"</b> to confirm this order and we’ll move on to your delivery address, or let me know if you’d like to add or change anything.`;

            await sendMessage(this.botToken, chatId, replyText, { parse_mode: 'HTML' });
            memory.addTurn(chatId, text, replyText);
          } else if (fnName === 'promptAddressStep') {
            memory.updateOrderState(chatId, { step: 'awaiting_address' });
            memory.logSession(chatId);
            await promptAddressStep(this.botToken, chatId);
          } else if (fnName === 'promptPhoneStep') {
            memory.updateOrderState(chatId, { step: 'awaiting_phone' });
            memory.logSession(chatId);
            await promptPhoneStep(this.botToken, chatId);
          } else if (fnName === 'processShippingAndTotal') {
            memory.updateOrderState(chatId, { step: 'calculating_shipping' });
            memory.logSession(chatId);
            await processShippingAndTotal(this.botToken, chatId);
          }
        }
        return;
      }

      // 5. Send textual response and store interaction turn in memory
      if (responseMessage.content) {
        const safeText = sanitizeTelegramHtml(responseMessage.content);
        await sendMessage(this.botToken, chatId, safeText, {
          parse_mode: 'HTML',
        });

        memory.addTurn(chatId, text, safeText);
        memory.logSession(chatId);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('[Chowry LLM Agent Exception]:', errorMessage);

      await sendMessage(
        this.botToken,
        chatId,
        "Oops! I had a quick hiccup processing that. 🍲\n\nCould you rephrase your request, or tap <b>Browse Menu</b> below to check our offerings?",
        { parse_mode: 'HTML' }
      );
    }
  }
}
