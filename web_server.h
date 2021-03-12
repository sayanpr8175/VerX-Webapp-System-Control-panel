#ifndef _WEB_SERVER_H
#define _WEB_SERVER_H
#include <Arduino.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>

extern AsyncWebServer server;

extern void web_server_setup();
#endif // _WEB_SERVER_H
