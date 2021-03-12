#include<Arduino.h>
#include "wifi.h"
#include "debug.h"

#include <ESP8266WiFi.h> //Connect to WiFi

String ipadress = "";

// Wifi Network Strings
String esid = "SAN aLiEnCe...WiFi_Dlnk";
String epass = "cansupermanfly@12332175";

#ifdef WIFI_LED
    int wifiLedState = !WIFI_LED_ON_STATE;
    unsigned long wifiLedTimeout = millis();
#endif

void get_ip () {
    IPAddress myAdress = WiFi.localIP();
    char tmpStr[40];
    sprintf(tmpStr, "%d.%d.%d.%d", myAdress[0], myAdress[1], myAdress[2], myAdress[3]);
    ipadress = tmpStr;
    DBUG("[WiFi] Connected, IP: ");
    DBUGLN(tmpStr);

    #ifdef WIFI_LED
        wifiLedState = WIFI_LED_ON_STATE;
        digitalWrite(WIFI_LED, wifiLedState);
    #endif
}

void start_client() {
    DBUG("[WiFI] Connecting to SSID: ");
    DBUGLN(esid.c_str());
    DBUG("Pass: ");
    DBUGLN(epass.c_str());

    WiFi.begin(esid.c_str(), epass.c_str());
    delay(50);

    if(WiFi.waitForConnectResult() != WL_CONNECTED)
    {
        DBUGLN("[WiFi] WiFi connect failed! Rebooting...");
        delay(1000);
        ESP.restart();
    }
    get_ip();
}

void wifi_start() {
   WiFi.mode(WIFI_STA);
   start_client();
}

void wifi_setup() {
    #ifdef WIFI_LED
        pinMode(WIFI_LED, OUTPUT);
        digitalWrite(WIFI_LED, wifiLedState);
    #endif

    wifi_start();
}

void wifi_loop() {

    #ifdef WIFI_LED
        if(millis() > wifiLedTimeout) {
            wifiLedState = !wifiLedState;
            digitalWrite(WIFI_LED, wifiLedState);

            if(wifiLedState == WIFI_LED_ON_STATE) {
                wifiLedTimeout = millis() + WIFI_LED_ON_TIME;
            } else {
                wifiLedTimeout = millis() + WIFI_LED_OFF_TIME;
            }
        }
    #endif
}
