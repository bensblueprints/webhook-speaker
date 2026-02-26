# 🔊 Webhook Speaker

**Turn any webhook into an instant audio notification.**

Sales, leads, alerts, custom messages - hear them the moment they happen through a WiFi-connected speaker.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-ESP32-green.svg)
![Hosting](https://img.shields.io/badge/hosting-Netlify-teal.svg)

## ✨ Features

- **Instant Audio Notifications** - Hear a sound the moment a webhook fires
- **Pre-built Integrations** - Works with Stripe, Shopify, GoHighLevel, and any webhook sender
- **Custom Sounds** - Use preset sounds or upload your own MP3 files
- **Custom Messages** - Make it say whatever you want
- **Simple Hardware** - Just an ESP32 and a small speaker
- **Serverless Backend** - Hosted free on Netlify

## 🎯 Use Cases

| Event | Sound |
|-------|-------|
| 💰 "You just got a sale!" | Cash register |
| 📋 "New lead from Facebook" | Notification chime |
| 📧 "New email subscriber" | Ding |
| 🚪 "Someone's at the door" | Doorbell |
| 👀 "Motion detected!" | Alarm |
| ⚠️ "Server is down!" | Alert |
| 😂 "Kids just snuck out" | Custom sound |

## 🚀 Quick Start

### 1. Deploy the Webhook Server

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/bensblueprints/webhook-speaker)

Or manually:

```bash
# Clone the repo
git clone https://github.com/bensblueprints/webhook-speaker.git
cd webhook-speaker

# Install dependencies
npm install

# Deploy to Netlify
netlify deploy --prod
```

### 2. Build the Hardware

**Parts needed:**
- ESP32 DevKit (~$5)
- DFPlayer Mini MP3 module (~$3)
- MicroSD card (~$5)
- Small speaker (3W) (~$3)

**Wiring:**

```
DFPlayer Mini → ESP32
------------------
VCC  → 5V
GND  → GND
RX   → GPIO 16 (via 1K resistor)
TX   → GPIO 17
SPK1 → Speaker +
SPK2 → Speaker -
```

### 3. Flash the Firmware

1. Open `firmware/webhook_speaker.ino` in Arduino IDE
2. Install required libraries:
   - WiFiManager
   - ArduinoJson
   - DFRobotDFPlayerMini
3. Update WiFi credentials and webhook URL
4. Upload to ESP32

### 4. Add Sound Files to SD Card

Create MP3 files on the SD card with these names:
```
001.mp3 - Cash register sound
002.mp3 - Notification chime
003.mp3 - Alarm
004.mp3 - Doorbell
005.mp3 - Custom 1
006.mp3 - Custom 2
```

### 5. Connect Your Webhooks

Point any webhook to your endpoint:

```
POST https://your-site.netlify.app/.netlify/functions/webhook
```

## 📡 API Reference

### Send a Notification

```bash
POST /.netlify/functions/webhook

Content-Type: application/json
```

**Basic Example:**

```json
{
  "event_type": "sale",
  "amount": 4999
}
```

**Custom Message:**

```json
{
  "event_type": "custom",
  "message": "Wake up! The kids snuck out!",
  "sound": "alarm.mp3"
}
```

### Event Types

| Event Type | Sound |
|------------|-------|
| `sale`, `new_sale`, `payment` | Cash register |
| `lead`, `new_lead`, `form_submission` | Notification |
| `doorbell` | Doorbell |
| `alarm`, `wake_up`, `kids_snuck_out` | Alarm |
| `stripe.payment_intent.succeeded` | Cash register |
| `shopify.orders.create` | Cash register |
| `gohighlevel.contact.create` | Notification |

### Poll for Notifications (Speaker Endpoint)

```bash
GET /.netlify/functions/webhook?key=your-speaker-key
```

Returns:
```json
{
  "success": true,
  "count": 2,
  "notifications": [
    {
      "id": "abc123",
      "timestamp": "2024-01-01T12:00:00Z",
      "event_type": "sale",
      "sound": "cash-register.mp3",
      "message": "Cha-ching! New sale!",
      "data": {
        "amount": "49.99"
      }
    }
  ]
}
```

## 🔌 Integrations

### Stripe

Add this webhook URL to your Stripe dashboard:
```
https://your-site.netlify.app/.netlify/functions/webhook
```

Events to subscribe:
- `payment_intent.succeeded`
- `charge.succeeded`

### Shopify

Add this webhook URL in Shopify Admin → Settings → Notifications:
```
https://your-site.netlify.app/.netlify/functions/webhook
```

Events:
- Order created
- Order paid

### GoHighLevel

In your GHL automation, add an HTTP action:
```
POST https://your-site.netlify.app/.netlify/functions/webhook
Body: {"event_type": "new_lead", "message": "New lead from GHL!"}
```

### Zapier / Make

Use the Webhooks action to POST to your endpoint.

### n8n

Use the HTTP Request node to POST to your endpoint.

## 🧪 Testing

Run the test suite:

```bash
# Test against local dev server
npm run dev  # In one terminal
npm test     # In another terminal

# Test against production
WEBHOOK_URL=https://your-site.netlify.app/.netlify/functions/webhook npm test
```

Or use curl:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type": "sale", "amount": 9999}'
```

## 🛠️ Hardware Alternatives

### Option 1: DFPlayer Mini (Recommended)
- Plays MP3 files from SD card
- High quality audio
- Easy to find sounds online

### Option 2: I2S DAC (MAX98357A)
- Streams audio from URLs
- No SD card needed
- Requires more memory

### Option 3: Piezo Buzzer
- Ultra cheap (~$0.50)
- Simple tones only
- Good for basic alerts

## 📁 Project Structure

```
webhook-speaker/
├── netlify/
│   └── functions/
│       └── webhook.js      # Serverless webhook handler
├── firmware/
│   └── webhook_speaker.ino # ESP32 Arduino code
├── public/
│   └── index.html          # Landing page
├── sounds/                  # Sound files (optional)
├── test/
│   └── test-webhook.js     # Test script
├── netlify.toml
├── package.json
└── README.md
```

## 🔒 Security

- Use a unique speaker key for polling
- Consider adding webhook signature verification for production
- Don't expose sensitive data in notifications

## 📝 License

MIT License - feel free to use this for any purpose!

## 🙏 Credits

Built by [Benjamin Tate](https://advancedmarketing.co) at Advanced Marketing.

---

**Made with ❤️ for entrepreneurs who want to hear their success**
