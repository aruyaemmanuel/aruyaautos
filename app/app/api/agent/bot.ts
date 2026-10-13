// // import {
// //   TelegramUpdate,
// //   sendMessage,
// //   answerCallbackQuery,
// //   sendMainMenu,
// //   renderServiceDetail,
// //   recordInquiryConfirmation,
// //   getBusinessInfo,
// //   getMenuInfo,
// // } from './apihandlers';
// // import { LLMHandler } from './llm_handler';
// // import { memory } from './memory';

// // export class Bot {
// //   private token: string;
// //   private groq_key: string;
// //   private agent: LLMHandler;

// //   constructor(token: string, groq_key: string) {
// //     this.token = token;
// //     this.groq_key = groq_key;
// //     this.agent = new LLMHandler(this.groq_key, this.token);
// //   }

// //   /**
// //    * Primary entry point for processing incoming webhook updates.
// //    */
// //   async processUpdate(update: TelegramUpdate): Promise<void> {
// //     // 1. Handle Inline Button Clicks (Callback Queries)
// //     if (update.callback_query) {
// //       await this.handleCallbackQuery(update.callback_query);
// //       return;
// //     }

// //     // 2. Handle Direct Messages (Text, Location, Contact)
// //     if (update.message) {
// //       const { chat, from, text, location, contact } = update.message;
// //       const chatId = chat.id;
// //       const senderName = from.first_name || 'there';
// //       const messageText = text?.trim() || '';

// //       console.log(
// //         `[Incoming Message] Chat: ${chatId} | User: ${senderName} | Text: "${messageText}"`
// //       );

// //       // Handle Telegram Native Shared Location
// //       if (location) {
// //         await this.handleLocationReceived(chatId, location.latitude, location.longitude);
// //         return;
// //       }

// //       // Handle Telegram Native Shared Contact / Phone Number
// //       if (contact) {
// //         await this.handleContactReceived(chatId, contact.phone_number);
// //         return;
// //       }

// //       // Handle Commands
// //       if (messageText === '/start') {
// //         await sendMainMenu(this.token, chatId, senderName);
// //       } else if (messageText.startsWith('/')) {
// //         await sendMessage(
// //           this.token,
// //           chatId,
// //           "Sorry, I don't recognize that command yet."
// //         );
// //       } else {
// //         await this.handleGenericMessage(chatId, senderName, messageText);
// //       }
// //     }
// //   }

// //   /**
// //    * Processes button click callbacks and routes to respective workflow views.
// //    */
// //   private async handleCallbackQuery(
// //     query: NonNullable<TelegramUpdate['callback_query']>
// //   ): Promise<void> {
// //     const chatId = query.message?.chat.id;
// //     const messageId = query.message?.message_id;
// //     const data = query.data;
// //     const userName = query.from.first_name || 'there';

// //     if (!chatId || !messageId || !data) return;

// //     try {
// //       console.log('[Callback Received]:', data);

// //       switch (data) {
// //         case 'menu:main':
// //           await sendMainMenu(this.token, chatId, userName);
// //           break;

// //         case 'browse_menu':
// //           await getMenuInfo(this.token, chatId);
// //           break;

// //         case 'business_info':
// //           await getBusinessInfo(this.token, chatId, 'business_info');
// //           break;

// //         case 'cart:view':
// //         case 'order:start':
// //           await sendMessage(
// //             this.token,
// //             chatId,
// //             `🛒 <b>Ready to order, ${userName}?</b>\n\nSimply type what you'd like in the chat below!\n\n<i>Example: "2 spoons of Jollof rice, 1 fried chicken, and 1 water"</i>`,
// //             { parse_mode: 'HTML' }
// //           );
// //           break;

// //         case 'checkout:start':
// //           await this.promptAddressStep(chatId);
// //           break;

// //         case 'order:pay':
// //           await this.processPaymentGateway(chatId);
// //           break;

// //         case 'order:cancel':
// //           memory.clearSession(chatId);
// //           await sendMessage(
// //             this.token,
// //             chatId,
// //             '❌ Your order has been cancelled. Tap <b>Browse Menu</b> whenever you are ready to order again!',
// //             { parse_mode: 'HTML' }
// //           );
// //           break;

// //         case 'track_order':
// //           await sendMessage(
// //             this.token,
// //             chatId,
// //             '📦 <b>Track Order</b>\n\nPlease enter your phone number or Order ID in the chat to check your status.',
// //             { parse_mode: 'HTML' }
// //           );
// //           break;

// //         case 'contact_support':
// //           await recordInquiryConfirmation(
// //             this.token,
// //             chatId,
// //             'contact_support',
// //             messageId
// //           );
// //           break;

// //         default:
// //           if (data.startsWith('service:')) {
// //             await renderServiceDetail(this.token, chatId, data, messageId);
// //           } else {
// //             console.warn(`[Callback Query] Unhandled callback data: ${data}`);
// //           }
// //           break;
// //       }
// //     } catch (error: any) {
// //       console.error(
// //         `[Callback Error] Failed to process callback "${data}": ${
// //           error?.message || String(error)
// //         }`
// //       );
// //     } finally {
// //       await answerCallbackQuery(this.token, query.id).catch((err: any) =>
// //         console.error(`[Callback Answer Error]: ${err?.message || String(err)}`)
// //       );
// //     }
// //   }


  
// //   private async handleGenericMessage(
// //     chatId: number,
// //     senderName: string,
// //     text: string
// //   ): Promise<void> {
// //     const currentState = memory.getOrderState(chatId);

// //     // If waiting for manual address entry in chat
// //     if (currentState.step === 'awaiting_address' && text !== '✍️ Type Address Manually') {
// //       memory.updateOrderState(chatId, {
// //         delivery: { ...currentState.delivery, address: text },
// //       });
// //       await sendMessage(this.token, chatId, `📍 Address set to: <b>${text}</b>`, {
// //         parse_mode: 'HTML',
// //       });
// //       await this.promptPhoneStep(chatId);
// //       return;
// //     }

// //     // If waiting for manual phone entry in chat
// //     if (currentState.step === 'awaiting_phone') {
// //       memory.updateOrderState(chatId, {
// //         delivery: { ...currentState.delivery, phone: text },
// //       });
// //       await sendMessage(this.token, chatId, `📱 Phone set to: <b>${text}</b>`, {
// //         parse_mode: 'HTML',
// //       });
// //       await this.calculateShippingAndConfirm(chatId);
// //       return;
// //     }

// //     // Default conversational flow via LLM agent
// //     await this.agent.handleUserMessage(chatId, senderName, text);
// //   }
// // }


// import {
//   TelegramUpdate,
//   sendMessage,
//   answerCallbackQuery,
//   sendMainMenu,
//   renderServiceDetail,
//   recordInquiryConfirmation,
//   getBusinessInfo,
//   getMenuInfo,
//   promptAddressStep as apiPromptAddressStep,
//   promptPhoneStep as apiPromptPhoneStep,
//   processShippingAndTotal,
// } from './apihandlers';
// import { LLMHandler } from './llm_handler';
// import { memory } from './memory';

// export class Bot {
//   private token: string;
//   private groq_key: string;
//   private agent: LLMHandler;

//   constructor(token: string, groq_key: string) {
//     this.token = token;
//     this.groq_key = groq_key;
//     this.agent = new LLMHandler(this.groq_key, this.token);
//   }

//   /**
//    * Primary entry point for processing incoming webhook updates.
//    */
//   async processUpdate(update: TelegramUpdate): Promise<void> {
//     // 1. Handle Inline Button Clicks (Callback Queries)
//     if (update.callback_query) {
//       await this.handleCallbackQuery(update.callback_query);
//       return;
//     }

//     // 2. Handle Direct Messages (Text, Location, Contact)
//     if (update.message) {
//       const { chat, from, text, location, contact } = update.message;
//       const chatId = chat.id;
//       const senderName = from?.first_name || 'there';
//       const messageText = text?.trim() || '';

//       console.log(
//         `[Incoming Message] Chat: ${chatId} | User: ${senderName} | Text: "${messageText}"`
//       );

//       // Handle Telegram Native Shared Location
//       if (location) {
//         await this.handleLocationReceived(chatId, location.latitude, location.longitude);
//         return;
//       }

//       // Handle Telegram Native Shared Contact / Phone Number
//       if (contact) {
//         await this.handleContactReceived(chatId, contact.phone_number);
//         return;
//       }

//       // Handle Commands
//       if (messageText === '/start') {
//         await sendMainMenu(this.token, chatId, senderName);
//       } else if (messageText.startsWith('/')) {
//         await sendMessage(
//           this.token,
//           chatId,
//           "Sorry, I don't recognize that command yet."
//         );
//       } else {
//         await this.handleGenericMessage(chatId, senderName, messageText);
//       }
//     }
//   }

//   /**
//    * Processes button click callbacks and routes to respective workflow views.
//    */
//   private async handleCallbackQuery(
//     query: NonNullable<TelegramUpdate['callback_query']>
//   ): Promise<void> {
//     const chatId = query.message?.chat.id;
//     const messageId = query.message?.message_id;
//     const data = query.data;
//     const userName = query.from.first_name || 'there';

//     if (!chatId || !messageId || !data) return;

//     try {
//       console.log('[Callback Received]:', data);

//       switch (data) {
//         case 'menu:main':
//           await sendMainMenu(this.token, chatId, userName);
//           break;

//         case 'browse_menu':
//           await getMenuInfo(this.token, chatId);
//           break;

//         case 'business_info':
//           await getBusinessInfo(this.token, chatId, 'business_info');
//           break;

//         case 'cart:view':
//         case 'order:start':
//           await sendMessage(
//             this.token,
//             chatId,
//             `🛒 <b>Ready to order, ${userName}?</b>\n\nSimply type what you'd like in the chat below!\n\n<i>Example: "2 spoons of Jollof rice, 1 fried chicken, and 1 water"</i>`,
//             { parse_mode: 'HTML' }
//           );
//           break;

//         case 'checkout:start':
//           await this.promptAddressStep(chatId);
//           break;

//         case 'order:pay':
//           await this.processPaymentGateway(chatId);
//           break;

//         case 'order:cancel':
//           memory.clearSession(chatId);
//           await sendMessage(
//             this.token,
//             chatId,
//             '❌ Your order has been cancelled. Tap <b>Browse Menu</b> whenever you are ready to order again!',
//             { parse_mode: 'HTML' }
//           );
//           break;

//         case 'track_order':
//           await sendMessage(
//             this.token,
//             chatId,
//             '📦 <b>Track Order</b>\n\nPlease enter your phone number or Order ID in the chat to check your status.',
//             { parse_mode: 'HTML' }
//           );
//           break;

//         case 'contact_support':
//           await recordInquiryConfirmation(
//             this.token,
//             chatId,
//             'contact_support',
//             messageId
//           );
//           break;

//         default:
//           if (data.startsWith('service:')) {
//             await renderServiceDetail(this.token, chatId, data, messageId);
//           } else {
//             console.warn(`[Callback Query] Unhandled callback data: ${data}`);
//           }
//           break;
//       }
//     } catch (error: any) {
//       console.error(
//         `[Callback Error] Failed to process callback "${data}": ${
//           error?.message || String(error)
//         }`
//       );
//     } finally {
//       await answerCallbackQuery(this.token, query.id).catch((err: any) =>
//         console.error(`[Callback Answer Error]: ${err?.message || String(err)}`)
//       );
//     }
//   }

//   private async handleGenericMessage(
//     chatId: number,
//     senderName: string,
//     text: string
//   ): Promise<void> {
//     const currentState = memory.getOrderState(chatId);

//     // If waiting for manual address entry in chat
//     if (currentState.step === 'awaiting_address' && text !== '✍️ Type Address Manually') {
//       memory.updateOrderState(chatId, {
//         delivery: { ...currentState.delivery, address: text },
//       });
//       await sendMessage(this.token, chatId, `📍 Address set to: <b>${text}</b>`, {
//         parse_mode: 'HTML',
//       });
//       await this.promptPhoneStep(chatId);
//       return;
//     }

//     // If waiting for manual phone entry in chat
//     if (currentState.step === 'awaiting_phone') {
//       memory.updateOrderState(chatId, {
//         delivery: { ...currentState.delivery, phone: text },
//       });
//       await sendMessage(this.token, chatId, `📱 Phone set to: <b>${text}</b>`, {
//         parse_mode: 'HTML',
//       });
//       await this.calculateShippingAndConfirm(chatId);
//       return;
//     }

//     // Default conversational flow via LLM agent
//     await this.agent.handleUserMessage(chatId, senderName, text);
//   }

//   /**
//    * Handles incoming GPS location shares from Telegram
//    */
//   private async handleLocationReceived(
//     chatId: number,
//     latitude: number,
//     longitude: number
//   ): Promise<void> {
//     const addressString = `GPS Coordinates (${latitude}, ${longitude})`;
//     const currentState = memory.getOrderState(chatId);

//     memory.updateOrderState(chatId, {
//       delivery: { ...currentState.delivery, address: addressString },
//       step: 'awaiting_phone',
//     });
//     memory.logSession(chatId);

//     await sendMessage(
//       this.token,
//       chatId,
//       `📍 <b>Location received successfully!</b>\nSaved delivery location: <code>${addressString}</code>`,
//       { parse_mode: 'HTML' }
//     );

//     // Proceed to next step: requesting phone number
//     await this.promptPhoneStep(chatId);
//   }

//   /**
//    * Handles incoming contact share button clicks from Telegram
//    */
//   private async handleContactReceived(
//     chatId: number,
//     phoneNumber: string
//   ): Promise<void> {
//     const currentState = memory.getOrderState(chatId);

//     memory.updateOrderState(chatId, {
//       delivery: { ...currentState.delivery, phone: phoneNumber },
//       step: 'calculating_shipping',
//     });
//     memory.logSession(chatId);

//     await sendMessage(
//       this.token,
//       chatId,
//       `📱 <b>Phone number received!</b>\nSaved contact: <code>${phoneNumber}</code>`,
//       { parse_mode: 'HTML' }
//     );

//     // Proceed to final calculations and order summary card
//     await this.calculateShippingAndConfirm(chatId);
//   }

//   private async promptAddressStep(chatId: number): Promise<void> {
//     memory.updateOrderState(chatId, { step: 'awaiting_address' });
//     await apiPromptAddressStep(this.token, chatId);
//   }

//   private async promptPhoneStep(chatId: number): Promise<void> {
//     memory.updateOrderState(chatId, { step: 'awaiting_phone' });
//     await apiPromptPhoneStep(this.token, chatId);
//   }

//   private async calculateShippingAndConfirm(chatId: number): Promise<void> {
//     await processShippingAndTotal(this.token, chatId);
//   }

//   private async processPaymentGateway(chatId: number): Promise<void> {
//     memory.updateOrderState(chatId, { step: 'awaiting_payment' });
//     await sendMessage(
//       this.token,
//       chatId,
//       `💳 <b>Payment Gateway Integration</b>\n\nPayment link generation is ready! Please integrate your preferred gateway provider here.`,
//       { parse_mode: 'HTML' }
//     );
//   }
// }


import {
  TelegramUpdate,
  sendMessage,
  answerCallbackQuery,
  sendMainMenu,
  renderServiceDetail,
  recordInquiryConfirmation,
  getBusinessInfo,
  getMenuInfo,
  promptAddressStep,
  promptPhoneStep,
  processShippingAndTotal,
} from './apihandlers';
import { LLMHandler } from './llm_handler';
import { memory } from './memory';

export class Bot {
  private token: string;
  private groq_key: string;
  private agent: LLMHandler;

  constructor(token: string, groq_key: string) {
    this.token = token;
    this.groq_key = groq_key;
    this.agent = new LLMHandler(this.groq_key, this.token);
  }

  /**
   * Primary entry point for processing incoming webhook updates.
   */
  async processUpdate(update: TelegramUpdate): Promise<void> {
    // 1. Handle Inline Button Clicks (Callback Queries)
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    // 2. Handle Direct Messages (Text, Location, Contact)
    if (update.message) {
      const { chat, from, text, location, contact } = update.message;
      const chatId = chat.id;
      const senderName = from?.first_name || 'there';
      const messageText = text?.trim() || '';

      console.log(
        `[Incoming Message] Chat: ${chatId} | User: ${senderName} | Text: "${messageText}"`
      );

      // Handle Telegram Native Shared Location
      if (location) {
        await this.handleLocationReceived(chatId, location.latitude, location.longitude);
        return;
      }

      // Handle Telegram Native Shared Contact / Phone Number
      if (contact) {
        await this.handleContactReceived(chatId, contact.phone_number);
        return;
      }

      // Handle Commands
      if (messageText === '/start') {
        await sendMainMenu(this.token, chatId, senderName);
      } else if (messageText.startsWith('/')) {
        await sendMessage(
          this.token,
          chatId,
          "Sorry, I don't recognize that command yet."
        );
      } else {
        await this.handleGenericMessage(chatId, senderName, messageText);
      }
    }
  }

  /**
   * Processes button click callbacks and routes to respective workflow views.
   */
  private async handleCallbackQuery(
    query: NonNullable<TelegramUpdate['callback_query']>
  ): Promise<void> {
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;
    const userName = query.from.first_name || 'there';

    if (!chatId || !messageId || !data) return;

    try {
      console.log('[Callback Received]:', data);

      switch (data) {
        case 'menu:main':
          await sendMainMenu(this.token, chatId, userName);
          break;

        case 'browse_menu':
          await getMenuInfo(this.token, chatId);
          break;

        case 'business_info':
          await getBusinessInfo(this.token, chatId, 'business_info');
          break;

        case 'cart:view':
        case 'order:start':
          await sendMessage(
            this.token,
            chatId,
            `🛒 <b>Ready to order, ${userName}?</b>\n\nSimply type what you'd like in the chat below!\n\n<i>Example: "2 spoons of Jollof rice, 1 fried chicken, and 1 water"</i>`,
            { parse_mode: 'HTML' }
          );
          break;

        case 'checkout:start':
          memory.updateOrderState(chatId, { step: 'awaiting_address' });
          await promptAddressStep(this.token, chatId);
          break;

        case 'order:pay':
          memory.updateOrderState(chatId, { step: 'awaiting_payment' });
          await sendMessage(
            this.token,
            chatId,
            `💳 <b>Payment Gateway Integration</b>\n\nPayment link generation is ready! Please integrate your preferred gateway provider here.`,
            { parse_mode: 'HTML' }
          );
          break;

        case 'order:cancel':
          memory.clearSession(chatId);
          await sendMessage(
            this.token,
            chatId,
            '❌ Your order has been cancelled. Tap <b>Browse Menu</b> whenever you are ready to order again!',
            { parse_mode: 'HTML' }
          );
          break;

        case 'track_order':
          await sendMessage(
            this.token,
            chatId,
            '📦 <b>Track Order</b>\n\nPlease enter your phone number or Order ID in the chat to check your status.',
            { parse_mode: 'HTML' }
          );
          break;

        case 'contact_support':
          await recordInquiryConfirmation(
            this.token,
            chatId,
            'contact_support',
            messageId
          );
          break;

        default:
          if (data.startsWith('service:')) {
            await renderServiceDetail(this.token, chatId, data, messageId);
          } else {
            console.warn(`[Callback Query] Unhandled callback data: ${data}`);
          }
          break;
      }
    } catch (error: any) {
      console.error(
        `[Callback Error] Failed to process callback "${data}": ${
          error?.message || String(error)
        }`
      );
    } finally {
      await answerCallbackQuery(this.token, query.id).catch((err: any) =>
        console.error(`[Callback Answer Error]: ${err?.message || String(err)}`)
      );
    }
  }

  private async handleGenericMessage(
    chatId: number,
    senderName: string,
    text: string
  ): Promise<void> {
    const currentState = memory.getOrderState(chatId);

    // If waiting for manual address entry in chat
    if (currentState.step === 'awaiting_address' && text !== '✍️ Type Address Manually') {
         memory.updateOrderState(chatId, {
         delivery: { ...currentState.delivery, address: text },
     });
  
        // Nudge the LLM with the user's address so it can confirm and trigger promptPhoneStep naturally
        await this.agent.handleUserMessage(chatId, senderName, `My delivery address is: ${text}`);
      return;
    }

    // If waiting for manual phone entry in chat
    if (currentState.step === 'awaiting_phone') {
      memory.updateOrderState(chatId, {
        delivery: { ...currentState.delivery, phone: text },
      });
      await sendMessage(this.token, chatId, `📱 Phone set to: <b>${text}</b>`, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      });
      await processShippingAndTotal(this.token, chatId);
      return;
    }

    // Default conversational flow via LLM agent
    await this.agent.handleUserMessage(chatId, senderName, text);
  }

  /**
   * Handles incoming GPS location shares from Telegram
   */
  private async handleLocationReceived(
    chatId: number,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const addressString = `GPS Coordinates (${latitude}, ${longitude})`;
    const currentState = memory.getOrderState(chatId);

    memory.updateOrderState(chatId, {
      delivery: { ...currentState.delivery, address: addressString },
      step: 'awaiting_phone',
    });
    memory.logSession(chatId);

    await sendMessage(
      this.token,
      chatId,
      `📍 <b>Location received successfully!`,
      { parse_mode: 'HTML' }
    );

    // Proceed to next step: requesting phone number via API handler prompt
    await promptPhoneStep(this.token, chatId);
  }

  /**
   * Handles incoming contact share button clicks from Telegram
   */
  private async handleContactReceived(
    chatId: number,
    phoneNumber: string
  ): Promise<void> {
    const currentState = memory.getOrderState(chatId);

    memory.updateOrderState(chatId, {
      delivery: { ...currentState.delivery, phone: phoneNumber },
      step: 'calculating_shipping',
    });
    memory.logSession(chatId);

    await sendMessage(
      this.token,
      chatId,
      `📱 <b>Phone number received!</b>\nSaved contact: <code>${phoneNumber}</code>`,
      { parse_mode: 'HTML' }
    );

    // Proceed to final calculations and order summary card via API handler
    await processShippingAndTotal(this.token, chatId);
  }
}
