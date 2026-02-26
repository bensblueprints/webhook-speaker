// Webhook receiver - accepts webhooks from any source and queues sounds for the speaker
// Store pending notifications in memory (for demo) - use Redis/Supabase for production

let pendingNotifications = [];

const SOUND_MAPPINGS = {
  // Sales & Revenue
  'sale': { sound: 'cash-register.mp3', message: 'Cha-ching! New sale!' },
  'new_sale': { sound: 'cash-register.mp3', message: 'You just got a sale!' },
  'payment': { sound: 'cash-register.mp3', message: 'Payment received!' },
  'stripe.payment_intent.succeeded': { sound: 'cash-register.mp3', message: 'Stripe payment received!' },
  'shopify.orders.create': { sound: 'cash-register.mp3', message: 'New Shopify order!' },

  // Leads & Marketing
  'lead': { sound: 'notification.mp3', message: 'New lead!' },
  'new_lead': { sound: 'notification.mp3', message: 'New lead just came in!' },
  'form_submission': { sound: 'notification.mp3', message: 'Form submitted!' },
  'gohighlevel.contact.create': { sound: 'notification.mp3', message: 'New GHL contact!' },

  // Fun / Custom
  'kids_snuck_out': { sound: 'alarm.mp3', message: 'Alert! Motion detected!' },
  'doorbell': { sound: 'doorbell.mp3', message: 'Someone is at the door!' },
  'wake_up': { sound: 'alarm.mp3', message: 'Wake up!' },

  // Default
  'default': { sound: 'notification.mp3', message: 'New notification!' }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET - Speaker polls for pending notifications
  if (event.httpMethod === 'GET') {
    const speakerKey = event.queryStringParameters?.key;

    if (!speakerKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Speaker key required' })
      };
    }

    // Return and clear pending notifications for this speaker
    const notifications = [...pendingNotifications];
    pendingNotifications = [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: notifications.length,
        notifications
      })
    };
  }

  // POST - Receive webhook and queue notification
  if (event.httpMethod === 'POST') {
    try {
      let body = {};

      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        body = { raw: event.body };
      }

      // Determine event type from various webhook formats
      const eventType =
        body.event_type ||           // Generic
        body.type ||                 // Stripe
        body.topic ||                // Shopify
        body.event ||                // Custom
        event.queryStringParameters?.event ||  // URL param
        'default';

      // Get sound mapping
      const mapping = SOUND_MAPPINGS[eventType] || SOUND_MAPPINGS['default'];

      // Extract useful data
      const amount = body.amount || body.data?.object?.amount || body.total_price || null;
      const customerName = body.customer_name || body.data?.object?.customer_name || body.customer?.first_name || null;
      const customMessage = body.message || body.custom_message || null;
      const customSound = body.sound || body.custom_sound || null;

      // Build notification
      const notification = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: new Date().toISOString(),
        event_type: eventType,
        sound: customSound || mapping.sound,
        message: customMessage || mapping.message,
        data: {
          amount: amount ? (amount / 100).toFixed(2) : null,  // Convert cents to dollars
          customer_name: customerName,
          raw_event: eventType
        }
      };

      // Queue notification
      pendingNotifications.push(notification);

      // Keep only last 100 notifications
      if (pendingNotifications.length > 100) {
        pendingNotifications = pendingNotifications.slice(-100);
      }

      console.log(`[Webhook Speaker] Queued notification: ${eventType}`, notification);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Notification queued',
          notification_id: notification.id
        })
      };

    } catch (error) {
      console.error('[Webhook Speaker] Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
