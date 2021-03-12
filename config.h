#ifndef _CONFIG_H
#define _CONFIG_H
#include <Arduino.h>

// -------------------------------------------------------------------
// Load and save the Wifirelay config.
//
// This initial implementation saves the config to the EEPROM area of flash
// -------------------------------------------------------------------

extern void config_load_settings();
extern void config_save_relay_states();
extern void config_load_relay_states();

#endif // _CONFIG_H
