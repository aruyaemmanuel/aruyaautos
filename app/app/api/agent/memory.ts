export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}


export interface DeliveryDetails {
  address?: string;
  isCurrentLocation?: boolean;
  latitude?: number;
  longitude?: number;
  phone?: string;
  deliveryFee?: number;
}

export interface OrderState {
  items: OrderItem[];
  subtotal: number;
  delivery: DeliveryDetails;
  grandTotal: number;
  // Step lifecycle pipeline
  step: 
    | 'cart'                   // Selecting food
    | 'awaiting_address'       // Collecting location / custom address
    | 'awaiting_phone'         // Collecting contact number
    | 'calculating_shipping'   // Estimating / adding third-party delivery fee
    | 'confirming_order'       // Final summary confirmation before payment
    | 'awaiting_payment'       // Payment link generated
    | 'confirmed';             // Paid & sent to kitchen
  isComplete: boolean;
}



export interface UserSession {
  history: ChatMessage[];
  orderState: OrderState;
}

export class ShortTermMemory {
  private maxTurns: number;
  private sessions: Map<number, UserSession> = new Map();

  constructor(maxTurns: number = 6) {
    this.maxTurns = maxTurns;
  }

  private initSession(chatId: number): UserSession {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, {
        history: [],
        orderState: {
          items: [],
          subtotal: 0,
          step: 'cart',
          isComplete: false,
        },
      });
    }
    return this.sessions.get(chatId)!;
  }

  /**
   * Retrieves conversation history trimmed to the sliding window (maxTurns * 2 messages).
   */
  getHistory(chatId: number): ChatMessage[] {
    const session = this.initSession(chatId);
    return session.history.slice(-(this.maxTurns * 2));
  }

  /**
   * Records a user message and assistant reply pair in history.
   */
  addTurn(chatId: number, userInput: string, assistantReply: string): void {
    const session = this.initSession(chatId);
    session.history.push({ role: 'user', content: userInput });
    session.history.push({ role: 'assistant', content: assistantReply });
  }

  // --- ORDER & CHECKOUT STATE MANAGEMENT ---

  /**
   * Updates and merges active order items, delivery contact details, and checkout steps.
   */
  updateOrderState(chatId: number, update: Partial<OrderState>): void {
    const session = this.initSession(chatId);
    
    // Merge order items if supplied
    if (update.items) {
      session.orderState.items = update.items;
      session.orderState.subtotal = update.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
    }

    // Merge other fields (deliveryAddress, phoneNumber, step, isComplete, etc.)
    session.orderState = {
      ...session.orderState,
      ...update,
    };
  }

  /**
   * Retrieves the current order state and checkout progress for a user.
   */
  getOrderState(chatId: number): OrderState {
    const session = this.initSession(chatId);
    return session.orderState;
  }

  /**
   * Clears session data (used after order completion or explicit cancellation).
   */
  clearSession(chatId: number): void {
    this.sessions.delete(chatId);
  }

  // --- DEBUGGING & LOGGING METHODS ---

  /**
   * Logs conversation history and order state snapshot for a specific chat ID.
   */
  logSession(chatId: number): void {
    const session = this.sessions.get(chatId);
    if (!session || (session.history.length === 0 && session.orderState.items.length === 0)) {
      console.log(`[Memory Log] Chat ID ${chatId}: Empty / No Session`);
      return;
    }

    console.log(`\n=== 🍲 CHOWRY ORDER & MEMORY SNAPSHOT [Chat: ${chatId}] ===`);
    console.dir(session, { depth: null, colors: true });
    console.log(`=========================================================\n`);
  }

  /**
   * Returns a plain object map of all active user sessions in RAM.
   */
  getAllSessions(): Record<number, UserSession> {
    return Object.fromEntries(this.sessions);
  }

  /**
   * Logs all active user order sessions currently stored in RAM.
   */
  logAllSessions(): void {
    console.log(`\n=== 🌐 ALL ACTIVE CHOWRY SESSIONS (${this.sessions.size} Users) ===`);
    console.dir(this.getAllSessions(), { depth: null, colors: true });
    console.log(`=========================================================\n`);
  }
}

export const memory = new ShortTermMemory(6);
