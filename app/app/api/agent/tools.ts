import { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

/**
 * Tool definitions mapped to Chowry's API handlers and order state machine.
 */
export const agentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'updateOrderState',
      description: 'Updates and syncs the active cart items, calculates subtotals, and advances the checkout lifecycle step in memory.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Itemized list of food items selected or modified by the user.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the dish or item' },
                quantity: { type: 'number', description: 'Quantity or number of spoons' },
                unitPrice: { type: 'number', description: 'Price per individual unit/spoon in NGN' },
                totalPrice: { type: 'number', description: 'Total price for this line item (quantity * unitPrice)' },
              },
              required: ['name', 'quantity', 'unitPrice', 'totalPrice'],
            },
          },
          step: {
            type: 'string',
            enum: [
              'cart',
              'awaiting_address',
              'awaiting_phone',
              'calculating_shipping',
              'confirming_order',
              'awaiting_payment',
              'confirmed',
            ],
            description: 'The target checkout pipeline step.',
          },
        },
        required: ['items', 'step'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promptAddressStep',
      description: 'Triggers the interactive delivery location prompt with native buttons to share GPS location or type address manually.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'promptPhoneStep',
      description: 'Triggers the contact phone number collection prompt with native contact-sharing buttons.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'processShippingAndTotal',
      description: 'Calculates the logistics delivery fee, updates grand totals in memory, and displays the final confirmation card summary.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browseMenu',
      description: 'Displays the complete visual food catalog, pricing rules, per-spoon rates, and live availability badges.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'showMainMenu',
      description: 'Displays the welcome flyer with main navigation buttons (Browse Menu, About Us, Track Order, Support).',
      parameters: {
        type: 'object',
        properties: {
          userName: {
            type: 'string',
            description: 'The first name of the user to personalize the greeting.',
          },
        },
        required: ['userName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBusinessInfo',
      description: 'Retrieves official business details, operating overview, core services, and pricing policies.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Specific topic like overview, hours, or policies.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'showServiceInfo',
      description: 'Displays specific detail cards for special catering, event packages, or bulk food inquiries.',
      parameters: {
        type: 'object',
        properties: {
          serviceKey: {
            type: 'string',
            description: 'Unique key identifying the service tier (e.g., business_info, browse_menu, track_order, contact_support).',
          },
        },
        required: ['serviceKey'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookConsultation',
      description: 'Records customer support or bulk catering inquiries and confirms assistance.',
      parameters: {
        type: 'object',
        properties: {
          serviceKey: {
            type: 'string',
            description: 'Service identifier or package key.',
          },
        },
        required: ['serviceKey'],
      },
    },
  },
];
