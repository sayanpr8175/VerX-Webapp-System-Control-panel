#ifndef _RELAY_H
#define _RELAY_H

#include <Arduino.h>

#define RELAY_1 1 //GPIO14 -> D5 on NodeMcu
#define RELAY_2 2 //GPIO12 -> D6 on NodeMcu
#define RELAY_3 3 //GPIO13 -> D7 on NodeMcu

#define RELAY_1_PIN 14
#define RELAY_2_PIN 12
#define RELAY_3_PIN 13

#define ON 0
#define OFF 1

// Relays Settings
extern String relay_1_name;
extern String relay_2_name;
extern String relay_3_name;

extern bool relay_latch_enabled;

extern bool relay_1_state;
extern bool relay_2_state;
extern bool relay_3_state;

// -------------------------------------------------------------------
// Relay initialization
// -------------------------------------------------------------------
extern void relay_setup();

// -------------------------------------------------------------------
// Set relay state
// -------------------------------------------------------------------
extern void relay_set_state(uint8_t id, bool state);

#endif //_RELAY_H
