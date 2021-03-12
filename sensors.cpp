#include "sensors.h"
#include "debug.h"
#include "relay.h"

//for DHT22 and DS18B20 sensors
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>

// Uncomment used DHT type used
//#define DHTTYPE DHT11   // DHT 11
//#define DHTTYPE DHT21   // DHT 21 (AM2301)
#define DHTTYPE DHT22   // DHT 22  (AM2302), AM2321

//pin definition
#define DHTPIN 2 // DHT22->GPIO02
#define ONE_WIRE_BUS 2

unsigned long sensors_previous_millis = 0;
const int sensors_poll_interval = (int) 5*1000; //ms

float dallas_temperature;
float dht_temperature;
float dht_fahrenheit;
float dht_humidity;

String lastvalues = "";

char result[200];
char measurement[16];

// Initialize DHT sensor.
DHT dht(DHTPIN, DHTTYPE);
// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);
// Pass our oneWire reference to Dallas Temperature.
DallasTemperature dallas(&oneWire);

// -------------------------------------------------------------------
// SETUP
// -------------------------------------------------------------------
void sensors_setup() {
    dht.begin();
    dallas.begin();
}

// -------------------------------------------------------------------
// LOOP
// -------------------------------------------------------------------
void sensors_loop() {
    if(millis() - sensors_previous_millis >= sensors_poll_interval) 
    {
        strcpy(result, "");

        sprintf(result, "R1:%d,R2:%d,R3:%d",
        !relay_1_state,
        !relay_2_state,
        !relay_3_state);

        dht_humidity = dht.readHumidity();
        dht_temperature = dht.readTemperature();
        dht_fahrenheit = dht.readTemperature(true);

        if(isnan(dht_humidity) || isnan(dht_temperature) || isnan(dht_fahrenheit)) {
            DBUGLN(" ");
            DBUGLN("[sensors] Failed to read from DHT sensor!");
        }

        strcat(result, ",T1:");
        dtostrf(dht_temperature, 2, 2, measurement);
        strcat(result, measurement);

        strcat(result, ",H:");
        dtostrf(dht_humidity, 2, 2, measurement);
        strcat(result, measurement);

        dallas.requestTemperatures();
        dallas_temperature =dallas.getTempCByIndex(0);

        strcat(result, ",T2:");
        dtostrf(dallas_temperature, 2, 2, measurement);
        strcat(result, measurement);

        DBUG("[sensors] ");
        DBUGLN(result);

        lastvalues = result;

        sensors_previous_millis = millis(); 
    }
}
