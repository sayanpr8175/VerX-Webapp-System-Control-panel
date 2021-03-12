#ifndef _WIFI_H
#define _WIFI_H

#include <Arduino.h>

#ifndef WIFI_LED
 #define WIFI_LED 16
#endif

#ifdef WIFI_LED

    #ifndef WIFI_LED_ON_STATE
        #define WIFI_LED_ON_STATE LOW
    #endif

    #ifndef WIFI_LED_ON_TIME
        #define WIFI_LED_ON_TIME 50
    #endif

    #ifndef WIFI_LED_OFF_TIME
        #define WIFI_LED_OFF_TIME 4000
    #endif

#endif

// ipadress
extern String ipadress;

extern const char *esp_hostname;

extern void wifi_setup();
extern void wifi_loop();


#endif