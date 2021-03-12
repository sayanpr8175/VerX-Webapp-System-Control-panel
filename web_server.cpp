#include <FS.h>

#include "web_server.h"
#include "config.h"
#include "debug.h"
#include "sensors.h"
#include "relay.h"
#include "ArduinoJson.h"

#define RELAY_STATE_MESSAGE 10
#define RELAY_MESSAGE_MEMORY_POOL 100

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

bool enableCors = true;

bool requestPreProcess(AsyncWebServerRequest *request, AsyncResponseStream *&response, const char *contentType="application/json") {
    response = request->beginResponseStream(contentType);

    if (enableCors) {
        response->addHeader("Access-Control-Allow-Origin", "*");
        return true;
    }
}

void handleHome(AsyncWebServerRequest *request) {
    if(SPIFFS.exists("/home.html")){
        request->send(SPIFFS, "/home.html");
    } else {
        request->send(200, "text/plain", "/home.html not found, have you flashed the SPIFFS?");
    }
}

void handleStatus(AsyncWebServerRequest * request) {
    AsyncResponseStream *response;
    if(false == requestPreProcess(request,response)) {
        return;
    }

    String s = "{";
    s += "\"relay_1_state\":" + String(relay_1_state ? "false":"true") + ",";
    s += "\"relay_2_state\":" + String(relay_2_state ? "false":"true") + ",";
    s += "\"relay_3_state\":" + String(relay_3_state ? "false":"true") + ",";

    s += "\"dallas_temperature\":\"" + String(dallas_temperature) + "\",";

    s += "\"dht_temperature\":\"" + String(dht_temperature) + "\",";
    s += "\"dht_humidity\":\"" + String(dht_humidity) + "\"";
    s += "}";

    DBUG("[web_server] '/status' response");
    DBUGLN(s);

    response->setCode(200);
    response->print(s);
    request->send(response);
}

void handleConfig(AsyncWebServerRequest * request) {
    AsyncResponseStream *response;
    if(false == requestPreProcess(request,response)) {
        return;
    }

    String s = "{";
    s += "\"relay_1_name\":\"" + relay_1_name + "\",";
    s += "\"relay_2_name\":\"" + relay_2_name + "\",";
    s += "\"relay_3_name\":\"" + relay_3_name + "\"";
    s += "}";

    DBUG("[web_server] '/config' response");
    DBUGLN(s);

    response->setCode(200);
    response->print(s);
    request->send(response);
}

void handleLastValues(AsyncWebServerRequest * request) {
    AsyncResponseStream *response;
    if(false == requestPreProcess(request,response)) {
        return;
    }

    DBUG("[web_server] '/lastvalues' response");
    DBUGLN(lastvalues);

    response->setCode(200);
    response->print(lastvalues);
    request->send(response);
}

void handleNotFound(AsyncWebServerRequest * request) {
    DBUG("NOT_FOUND: ");
    if(request->method() == HTTP_GET)
      DBUGF("GET");
    else if(request->method() == HTTP_POST)
      DBUGF("POST");
    else if(request->method() == HTTP_DELETE)
      DBUGF("DELETE");
    else if(request->method() == HTTP_PUT)
      DBUGF("PUT");
    else if(request->method() == HTTP_PATCH)
      DBUGF("PATCH");
    else if(request->method() == HTTP_HEAD)
      DBUGF("HEAD");
    else if(request->method() == HTTP_OPTIONS)
      DBUGF("OPTIONS");
    else
      DBUGF("UNKNOWN");
    DBUGF(" http://%s%s\n", request->host().c_str(), request->url().c_str());

    if(request->contentLength()){
      DBUGF("_CONTENT_TYPE: %s\n", request->contentType().c_str());
      DBUGF("_CONTENT_LENGTH: %u\n", request->contentLength());
    }

    int headers = request->headers();
    int i;
    for(i=0;i<headers;i++){
      AsyncWebHeader* h = request->getHeader(i);
      DBUGF("_HEADER[%s]: %s\n", h->name().c_str(), h->value().c_str());
    }

    int params = request->params();
    for(i=0;i<params;i++){
      AsyncWebParameter* p = request->getParam(i);
      if(p->isFile()){
        DBUGF("_FILE[%s]: %s, size: %u\n", p->name().c_str(), p->value().c_str(), p->size());
      } else if(p->isPost()){
        DBUGF("_POST[%s]: %s\n", p->name().c_str(), p->value().c_str());
      } else {
        DBUGF("_GET[%s]: %s\n", p->name().c_str(), p->value().c_str());
      }
    }

    request->send(404);   
}

void handleRelayMessage(String msg) {
    DynamicJsonDocument doc (RELAY_MESSAGE_MEMORY_POOL);
    DeserializationError error = deserializeJson(doc, msg);

    if(error) {
        DBUG("[web_server] Websocket message deserialization failed with the following error: ");
        DBUGLN(error.c_str());
        return;
    }

    uint8_t relay_id = (uint8_t) doc["id"];
    bool relay_state = (bool) doc["state"];
    const char* relay_name = doc["name"];

    relay_set_state(relay_id, relay_state);

    if (relay_latch_enabled) {
        config_save_relay_states();
    }
}

void handleRecievedMessage(String msg) {

    DynamicJsonDocument doc (RELAY_MESSAGE_MEMORY_POOL);
    DeserializationError error = deserializeJson(doc, msg);

    if(error) {
        DBUG("[web_server] Websocket message deserialization failed with the following error: ");
        DBUGLN(error.c_str());
        return;
    }

    uint8_t msg_type = (uint8_t) doc["type"];

    switch (msg_type) {
        case RELAY_STATE_MESSAGE:
            handleRelayMessage(msg);
        break;

        default:
        break;
    }

}

void onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len){
  if(type == WS_EVT_CONNECT){
    DBUGF("ws[%s][%u] connect\n", server->url(), client->id());
    client->printf("Hello Client %u :)", client->id());
    client->ping();
  } else if(type == WS_EVT_DISCONNECT){
    DBUGF("ws[%s][%u] disconnect: %u\n", server->url(), client->id());
  } else if(type == WS_EVT_ERROR){
    DBUGF("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
  } else if(type == WS_EVT_PONG){
    DBUGF("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len)?(char*)data:"");
  } else if(type == WS_EVT_DATA){
    AwsFrameInfo * info = (AwsFrameInfo*)arg;
    String msg = "";
    if(info->final && info->index == 0 && info->len == len){
      //the whole message is in a single frame and we got all of it's data
      DBUGF("ws[%s][%u] %s-message[%llu]: ", server->url(), client->id(), (info->opcode == WS_TEXT)?"text":"binary", info->len);

      if(info->opcode == WS_TEXT){
        for(size_t i=0; i < info->len; i++) {
          msg += (char) data[i];
        }
      } else {
        char buff[3];
        for(size_t i=0; i < info->len; i++) {
          sprintf(buff, "%02x ", (uint8_t) data[i]);
          msg += buff ;
        }
      }
      DBUGF("%s\n",msg.c_str());
    }
    handleRecievedMessage(msg);
  }
}

void web_server_setup() {
    SPIFFS.begin();

    server.serveStatic("/", SPIFFS, "/")
          .setDefaultFile("home.html");

    // Start server & server root html /
    server.on("/", handleHome);

    server.on("/status", handleStatus);
    server.on("/config", handleConfig);
    server.on("/lastvalues", handleLastValues);

    server.onNotFound(handleNotFound);
    server.begin();

    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
}
