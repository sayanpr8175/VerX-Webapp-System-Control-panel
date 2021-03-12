#include "config.h"
#include "debug.h"
#include "relay.h"

#include <EEPROM.h>

#define BITMASK_RELAY_1 1
#define BITMASK_RELAY_2 2
#define BITMASK_RELAY_3 4

#define EEPROM_RELAY_STATES_SIZE    1

#define EEPROM_SIZE                 512

#define EEPROM_RELAY_STATES_START   0
#define EEPROM_RELAY_STATES_END (EEPROM_RELAY_STATES_START + EEPROM_RELAY_STATES_SIZE)

#define EEPROM_CONFIG_END EEPROM_RELAY_STATES_END

#if EEPROM_CONFIG_END > EEPROM_RELAY_STATES_SIZE
#error EEPROM_SIZE too small
#endif

void config_load_settings() {

    EEPROM.begin(EEPROM_SIZE);

    if(relay_latch_enabled) {
        config_load_relay_states();
    }

    EEPROM.end();

}

void config_save_relay_states() {

    uint8_t state_byte = 0;
    state_byte = relay_1_state | (relay_2_state << 1) | (relay_3_state << 2);
    
    EEPROM.begin(EEPROM_SIZE);
    EEPROM.write(EEPROM_RELAY_STATES_START, state_byte);
    EEPROM.end();

    DBUGF("[config] Save Relay States: ['%02x']: 1->[%d], 2->[%d], 3->[%d].", state_byte, relay_1_state, relay_2_state, relay_3_state);
}

void config_load_relay_states() {
    uint8_t state_byte = 0;
    EEPROM.begin(EEPROM_SIZE);
    state_byte = EEPROM.read(EEPROM_RELAY_STATES_START);
    EEPROM.end();

    relay_1_state = state_byte & BITMASK_RELAY_1;
    relay_2_state = state_byte & BITMASK_RELAY_2;
    relay_3_state = state_byte & BITMASK_RELAY_3;

    DBUGF("[config] Load Relay States: ['%02x']: 1->[%d], 2->[%d], 3->[%d].", state_byte, relay_1_state, relay_2_state, relay_3_state);
}
