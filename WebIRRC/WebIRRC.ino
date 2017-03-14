#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <IRremoteESP8266.h>

const char *ssid = "********";
const char *password = "***********";

ESP8266WebServer server (80);
IRsend irsend(4);                   //an IR led is connected to GPIO4 

void handleRoot() {		//main root webpage

	String temp =
"<!DOCTYPE html>"
"<html>"
"<head>"
"    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
"    <style>"
"     .contnr{"
"      background-color: lightgrey;"
"        margin: auto;"
"        width: 292px;"
"       height: 490px;"
"        border-style: solid;"
"        border-radius: 10%;"
"     }"
"    .rb {"
"     display: inline-block;"
"        color: white;"
"        text-align: center;"
"        font-weight: bold;"
"        background: linear-gradient(to bottom right, #2F4F4F, #80b3b3);"
"        position: relative;"
"        border-radius: 50%;"
"        padding: 0x;"
"        cursor: 24px;"
"        width: 45px;"
"        height: 45px;"
"        line-height: 45px;" 
"        font-size: 100%; "
"        margin: 5px;"
"        border:none;"
"        cursor: pointer;"
"        box-shadow: 0 4px #999;"
"        outline: none;"
"        -webkit-tap-highlight-color: rgba(255, 255, 255, 0);"
"    }"
"    .rb:active {"
"        box-shadow: 0 1px #666;"
"        transform: translateY(4px);"
"    }"    
"    .br {"
"     background: linear-gradient(to bottom right, red, #ff9999) !important;"
"    }"
"    .bb {"
"     background: linear-gradient(to bottom right, black, #737373) !important;"
"    }"
"    .bg {"
"     background: linear-gradient(to bottom right, green, #00e600) !important;"
"    }"
"    .rec{"
"     background: linear-gradient(to bottom right, orange, #ffd280) !important;"
"    }"
"    .grp {"
"        position: relatve;"
"        margin: 10px;"
"    }"
"    .emtp {"
"     box-shadow: none;"
"     background: lightgrey !important;"
"     color: lightgrey;"
"     cursor: default;"
"    }"
"    </style>"
"    <script>"
"        function tv(IRcode){"
"            var request = new XMLHttpRequest();"
"            var mid = \"led?code=6170\".concat(IRcode);"
"            request.open(\"GET\", mid, true);"
"            request.send(null);"
"        }"
"   </script>"
"</head>"
"<body>"
"<div class=\"contnr\">"
"    <div class=\"grp\"></div>"
"    <a class=\"rb\" onclick=\"tv('58A7')\">P-</a>"
"    <a class=\"rb\" onclick=\"tv('08F7')\">P+</a>"
"    <a class=\"rb\" onclick=\"tv('708F')\">V-</a>"
"    <a class=\"rb\" onclick=\"tv('B04F')\">V+</a>"
"    <a class=\"rb br\" onclick=\"tv('48B7')\">SH</a>"
"    <div class=\"grp\"></div>"
"    <a class=\"rb\" onclick=\"tv('00FF')\">0</a>"
"    <a class=\"rb\" onclick=\"tv('807F')\">1</a>"
"    <a class=\"rb\" onclick=\"tv('40BF')\">2</a>"
"    <a class=\"rb\" onclick=\"tv('C03F')\">3</a>"
"    <a class=\"rb\" onclick=\"tv('20DF')\">4</a>"
"    <a class=\"rb\" onclick=\"tv('A05F')\">5</a>"
"    <a class=\"rb\" onclick=\"tv('609F')\">6</a>"
"    <a class=\"rb\" onclick=\"tv('E01F')\">7</a>"
"    <a class=\"rb\" onclick=\"tv('10EF')\">8</a>"
"    <a class=\"rb\" onclick=\"tv('906F')\">9</a>"
"    <div class=\"grp\"></div>"
"    <a class=\"rb bb\" onclick=\"tv('C837')\">EPG</a>"
"    <a class=\"rb bb\" onclick=\"tv('7887')\">MY</a>"
"    <a class=\"rb bb\" onclick=\"tv('F807')\">MU</a>"
"    <a class=\"rb bb\" onclick=\"tv('28D7')\">BCK</a>"
"    <a class=\"rb bb\" onclick=\"tv('B44B')\">i</a>"
"    <div class=\"grp\"></div>"
"    <a class=\"rb bg\" onclick=\"tv('B847')\">RWD</a>"
"    <a class=\"rb bg\" onclick=\"tv('C43B')\">PL</a>"
"    <a class=\"rb bg\" onclick=\"tv('649B')\">FFD</a>"
"    <a class=\"rb bg\" onclick=\"tv('24DB')\">ST</a>"
"    <a class=\"rb rec\" onclick=\"tv('847B')\">R</a>"
"    <div class=\"grp\"></div>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"    <a class=\"rb\" onclick=\"tv('D02F')\">UP</a>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"    <a class=\"rb\" onclick=\"tv('D827')\">LE</a>"
"    <a class=\"rb bb\" onclick=\"tv('A857')\">OK</a>"
"    <a class=\"rb\" onclick=\"tv('38C7')\">RI</a>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"    <a class=\"rb\" onclick=\"tv('30CF')\">DO</a>"
"    <div class=\"rb emtp\">'</div>"
"    <div class=\"rb emtp\">'</div>"
"</div>"
"</body>"
"</html>"
;
	server.send ( 200, "text/html", temp ); //post page on address
}

void handleNotFound() {			//not found page
	String message = "File Not Found\n\n";
	message += "URI: ";
	message += server.uri();
	message += "\nMethod: ";
	message += ( server.method() == HTTP_GET ) ? "GET" : "POST";
	message += "\nArguments: ";
	message += server.args();
	message += "\n";

	for ( uint8_t i = 0; i < server.args(); i++ ) {
		message += " " + server.argName ( i ) + ": " + server.arg ( i ) + "\n";
	}

	server.send ( 404, "text/plain", message );
}

void handleCode(){		//handle GET request with code. 
  String scode = server.arg("code");
  char codez[9];
  scode.toCharArray(codez, 9);
  unsigned long codurino = strtoul(codez, 0, 16);
  Serial.print(codurino);
  for (int i=0; i<3; i++){
    irsend.sendNEC(codurino, 32);
    delay(40);
  }
  server.send( 200, "text/plain", ""); // empty OK response
}

void setup ( void ) {
  irsend.begin();                                                                                 //IR
	Serial.begin ( 115200 );
	WiFi.begin ( ssid, password );
	Serial.println ( "" );

	// Wait for connection
	while ( WiFi.status() != WL_CONNECTED ) {
		delay ( 500 );
		Serial.print ( "." );
	}

	Serial.println ( "" );
	Serial.print ( "Connected to " );
	Serial.println ( ssid );
	Serial.print ( "IP address: " );
	Serial.println ( WiFi.localIP() );

	if ( MDNS.begin ( "esp8266" ) ) {
		Serial.println ( "MDNS responder started" );
	}

	server.on ( "/", handleRoot );  //if root request
 	server.on ( "/led", handleCode);  //if GET request with code
	server.onNotFound ( handleNotFound ); //if not found
	server.begin();
	Serial.println ( "HTTP server started" );
}

void loop ( void ) {
  server.handleClient();
}



