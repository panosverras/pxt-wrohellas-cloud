WROHellasCloud.wifiSettings(
SerialPin.P0,
SerialPin.P1,
BaudRate.BaudRate115200,
"your_ssid",
"your_pw"
)
WROHellasCloud.cloudSettings("server ip", "server port", "unique station id")
while (!(WROHellasCloud.wifiStatus())) {
    WROHellasCloud.wifiConnect()
}
basic.forever(function () {
	
})
