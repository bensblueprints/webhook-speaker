/*
 * Webhook Speaker - ESP32 Firmware
 *
 * A WiFi-connected speaker that plays sounds when webhooks are received.
 * Perfect for: Sales notifications, lead alerts, doorbell, custom announcements
 *
 * Hardware Required:
 * - ESP32 DevKit (any variant)
 * - I2S DAC (MAX98357A recommended) OR
 * - DFPlayer Mini MP3 module + SD card
 * - Speaker (3W-5W recommended)
 *
 * Wiring (MAX98357A):
 * - VIN  -> 3.3V or 5V
 * - GND  -> GND
 * - DIN  -> GPIO 25
 * - BCLK -> GPIO 26
 * - LRC  -> GPIO 27
 *
 * Wiring (DFPlayer Mini):
 * - VCC -> 5V
 * - GND -> GND
 * - RX  -> GPIO 16 (via 1K resistor)
 * - TX  -> GPIO 17
 * - SPK1/SPK2 -> Speaker
 *
 * Setup:
 * 1. Install Arduino IDE
 * 2. Add ESP32 board support
 * 3. Install libraries: WiFiManager, ArduinoJson, ESP32-audioI2S (or DFRobotDFPlayerMini)
 * 4. Update WiFi credentials and webhook URL below
 * 5. Upload to ESP32
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============= CONFIGURATION =============
// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Webhook Server
const char* WEBHOOK_URL = "https://YOUR-SITE.netlify.app/.netlify/functions/webhook";
const char* SPEAKER_KEY = "your-secret-speaker-key";  // Auth key for polling

// Polling interval (milliseconds)
const int POLL_INTERVAL = 2000;  // Check every 2 seconds

// Audio output method (uncomment one)
#define USE_DFPLAYER    // DFPlayer Mini MP3 module
// #define USE_I2S      // I2S DAC (MAX98357A)

// ============= HARDWARE SETUP =============

#ifdef USE_DFPLAYER
#include <DFRobotDFPlayerMini.h>
#include <HardwareSerial.h>

HardwareSerial dfSerial(2);  // Use UART2
DFRobotDFPlayerMini dfPlayer;

// DFPlayer sound file mapping (files on SD card: 001.mp3, 002.mp3, etc.)
#define SOUND_CASH_REGISTER 1
#define SOUND_NOTIFICATION  2
#define SOUND_ALARM         3
#define SOUND_DOORBELL      4
#define SOUND_CUSTOM_1      5
#define SOUND_CUSTOM_2      6

void initAudio() {
  dfSerial.begin(9600, SERIAL_8N1, 17, 16);  // RX=17, TX=16
  delay(1000);

  if (!dfPlayer.begin(dfSerial)) {
    Serial.println("DFPlayer init failed!");
    while(true);
  }

  dfPlayer.volume(25);  // 0-30
  Serial.println("DFPlayer ready!");
}

void playSound(const char* soundFile) {
  int trackNum = SOUND_NOTIFICATION;  // Default

  if (strstr(soundFile, "cash") != NULL) trackNum = SOUND_CASH_REGISTER;
  else if (strstr(soundFile, "alarm") != NULL) trackNum = SOUND_ALARM;
  else if (strstr(soundFile, "doorbell") != NULL) trackNum = SOUND_DOORBELL;
  else if (strstr(soundFile, "notification") != NULL) trackNum = SOUND_NOTIFICATION;

  Serial.printf("Playing track %d for: %s\n", trackNum, soundFile);
  dfPlayer.play(trackNum);
}

#endif

#ifdef USE_I2S
#include "Audio.h"

Audio audio;

// I2S pins
#define I2S_DOUT  25
#define I2S_BCLK  26
#define I2S_LRC   27

void initAudio() {
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(15);  // 0-21
  Serial.println("I2S Audio ready!");
}

void playSound(const char* soundFile) {
  // Play from SPIFFS or URL
  String url = "https://YOUR-SITE.netlify.app/sounds/" + String(soundFile);
  audio.connecttohost(url.c_str());
}

#endif

// ============= GLOBALS =============
unsigned long lastPoll = 0;
bool wifiConnected = false;

// ============= SETUP =============
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Webhook Speaker Starting ===");

  // Connect to WiFi
  connectWiFi();

  // Initialize audio
  initAudio();

  // Play startup sound
  playSound("notification.mp3");

  Serial.println("Ready! Listening for webhooks...\n");
}

// ============= MAIN LOOP =============
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  }

  // Poll for new notifications
  if (millis() - lastPoll >= POLL_INTERVAL) {
    lastPoll = millis();
    checkForNotifications();
  }

  #ifdef USE_I2S
  audio.loop();
  #endif

  delay(10);
}

// ============= WIFI =============
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

// ============= WEBHOOK POLLING =============
void checkForNotifications() {
  if (!wifiConnected) return;

  HTTPClient http;
  String url = String(WEBHOOK_URL) + "?key=" + SPEAKER_KEY;

  http.begin(url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    processNotifications(payload);
  } else {
    Serial.printf("HTTP Error: %d\n", httpCode);
  }

  http.end();
}

void processNotifications(String payload) {
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.println("JSON parse error");
    return;
  }

  int count = doc["count"];
  if (count == 0) return;

  Serial.printf("Received %d notification(s)!\n", count);

  JsonArray notifications = doc["notifications"];
  for (JsonObject notification : notifications) {
    const char* sound = notification["sound"];
    const char* message = notification["message"];
    const char* eventType = notification["event_type"];

    Serial.println("---");
    Serial.printf("Event: %s\n", eventType);
    Serial.printf("Message: %s\n", message);
    Serial.printf("Sound: %s\n", sound);

    // Play the sound
    playSound(sound);

    // Wait for sound to finish before next notification
    delay(3000);
  }
}
