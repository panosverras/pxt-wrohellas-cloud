WROHellasCloud.wifiSettings(
SerialPin.P0,
SerialPin.P1,
BaudRate.BaudRate115200,
"",
""
)
WROHellasCloud.wifiConnect()
while (!(WROHellasCloud.wifiStatus())) {
    WROHellasCloud.wifiConnect()
}
basic.showIcon(IconNames.Yes)
