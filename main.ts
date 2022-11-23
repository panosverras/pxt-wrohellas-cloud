WROHellasCloud.wifiSettings(
SerialPin.P12,
SerialPin.P13,
BaudRate.BaudRate115200,
"",
""
)
WROHellasCloud.wifiConnect()
while (!(WROHellasCloud.wifiStatus())) {
    WROHellasCloud.wifiConnect()
}
basic.showIcon(IconNames.Yes)
basic.forever(function () {
	
})
