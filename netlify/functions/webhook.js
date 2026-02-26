// Webhook receiver - accepts webhooks from any source and queues sounds for the speaker
// Store pending notifications in memory (for demo) - use Redis/Supabase for production

let pendingNotifications = [];

// Single message for all webhooks
const DEFAULT_MESSAGE = "You have a new order";
const DEFAULT_SOUND = "new-order.mp3";

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

      // Build notification - always the same message
      const notification = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: new Date().toISOString(),
        sound: DEFAULT_SOUND,
        message: DEFAULT_MESSAGE
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
