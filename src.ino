#include <Arduino.h>
#include "debug.h"
#include "wifi.h"
#include "relay.h"
#include "sensors.h"
#include "web_server.h"
#include "config.h"

// -------------------------------------------------------------------
// SETUP
// -------------------------------------------------------------------
void setup() {
    delay(2000);
    DEBUG_BEGIN(115200);

    DBUGLN();
    DBUG("Wireless - WiFi Relay");
    DBUG(ESP.getChipId());

    // Read saved settings from the config
    config_load_settings();
    // Initialise the WiFi
    wifi_setup();

    // Initialise sensors
    sensors_setup();

    // Initialise relays
    relay_setup();

    // Bring up the web server
    web_server_setup();

    DBUG("[src] Server started");
    delay(100);
}

// -------------------------------------------------------------------
// LOOP
// -------------------------------------------------------------------
void loop () {

    //wifi loop
    wifi_loop();

    //sensors loop
    sensors_loop();

}