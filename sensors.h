#ifndef _SENSORS_H
#define _SENSORS_H

#include <Arduino.h>

extern float dallas_temperature;
extern float dht_temperature;
extern float dht_fahrenheit;
extern float dht_humidity;

extern String lastvalues;

extern void sensors_setup();
extern void sensors_loop();

#endif
