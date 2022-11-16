/**
 * MakeCode extension for WROHellas Cloud (https://wrohellas.gr)
 * 
 * This extension is based on ThingSpeak MakeCode extension
 */
//% color=#009bbb weight=150 icon="\uf1ae" block="WROHellas"
namespace WROHellasCloud {

    let ssid: string = null
    let pwd: string = null
    let cloud_ip: string = ""
    let cloud_port: string = ""
    let station_id: string = ""
    let station_token: string = ""
    let mission_id: string = "ERROR"
    let missionX: number = -999
    let missionY: number = -999
    let missionResult: number = -1
    let debug = false

    let wifi_connected: boolean = false
    let cloud_connected: boolean = false





    /**
    * WiFi init settings
    */
    //% block="WiFi settings (ESP8266)|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID %wifi_ssid|Wifi PW %wifi_pwd"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% wifi_ssid.defl=your_ssid
    //% wifi_pwd.defl=your_pw
    export function wifiSettings(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, wifi_ssid: string, wifi_pwd: string) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        serial.setRxBufferSize(128)
        serial.setTxBufferSize(128)
        ssid = wifi_ssid
        pwd = wifi_pwd
    }


    /**
    * Farmbots Cloud init settings
    */
    //% block="Cloud settings (WROHellas)|URL/IP %ip|Port %port|Station ID %sid|Token %stoken"
    //% ip.defl="server ip"
    //% port.defl="server port"
    //% sid.defl="this station id"
    //% stoken.defl="this station token"
    export function cloudSettings(ip: string, port: string, sid: string, stoken: string) {
        cloud_ip = ip
        cloud_port = port
        station_id = sid
        station_token = stoken
    }


    // Reads from serial rx buffer
    function readBuf(): string {
        basic.pause(1000)
        let time: number = input.runningTime()
        let sData = ""
        let s = ""
        while (true) {
            s = serial.readString()
            if (s === "") { break } else { sData += s }
            if (input.runningTime() - time > 10000) { break }
        }
        if (debug == true) { basic.showString(sData) }
        return sData
    }


    // Reads from serial rx buffer for specific time
    function readTimedBuf(t: number = 2000): string {
        let time: number = input.runningTime()
        let sData = ""
        while (input.runningTime() - time < t) {
            sData += serial.readString()
        }
        if (debug == true) { basic.showString(sData) }
        return sData
    }


    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        if (debug == true) { basic.showString(command) }
        basic.pause(wait)
    }


    // Clears serial rx buffer
    function clearBuf() {
        basic.pause(500)
        let b: Buffer = serial.readBuffer(0)
    }


    // Checks if wifi properly connected
    function wifiStatus(): boolean {
        basic.pause(1000)
        clearBuf()
        sendAT("AT+CIFSR", 10)
        let s = readTimedBuf(2000)
        if (s.includes("0.0.0.0")) { return false } else { return true }
    }


    /**
    * Connects to WiFi router
    */
    //% block="WiFi connect"
    function wifiConnect() {
        wifi_connected = false
        sendAT("AT+RESTORE", 3000) // restore to factory settings
        clearBuf()
        sendAT("AT+RST", 2000) // reset
        clearBuf()
        sendAT("ATE0", 500)
        clearBuf()
        sendAT("AT+CWMODE=1", 500) // set to STA mode
        clearBuf()
        sendAT("AT+CIPMODE=0", 500) // 
        clearBuf()
        sendAT("AT+CIPMUX=0", 500) // 
        clearBuf()
        sendAT("AT+CWAUTOCONN=1", 500) // enable reconnecting when connection is dropped
        clearBuf()
        while (wifi_connected == false) {
            sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pwd + "\"", 10000) // connect to Wifi router
            wifi_connected = wifiStatus()
        }
    }


    /**
    * Resets mission data (missionID, X, Y, result etc... )
    */
    //% block="Reset mission"
    export function resetMission() {
        cloud_connected = false
        mission_id = "ERROR"
        missionX = -999
        missionY = -999
        missionResult = -1
    }


    /**
    * Disconnects from WROHellas cloud server
    */
    //% block="Cloud disconnect"
    function cloudDisconnect() {
        cloud_connected = false
        sendAT("AT+CIPCLOSE", 1000)
        clearBuf()
    }


    /**
    * Connects to WROHellas cloud server
    */
    //% block="Cloud connect"
    function cloudConnect() {
        cloud_connected = false
        if (wifi_connected == false) { wifiConnect() }
        /** if (cloud_connected == false) { cloudDisconnect() } **/
        let s = ""
        let counter = 0
        clearBuf()
        while (cloud_connected == false) {
            cloudDisconnect()
            clearBuf()
            let cipstart = "AT+CIPSTART=\"TCP\",\"" + cloud_ip + "\"," + cloud_port // + "," + "10"
            sendAT(cipstart, 10) // connect to cloud server
            s = readTimedBuf()
            counter = counter + 1
            if (s.includes("CONNECT")) { /** && s.includes("OK")) OR s.includes("ALREADY CONNECTED") {  */
                cloud_connected = true
            }
        }
    }


    /**
    * Connect to WROHellas cloud app and start a new mission.
    */
    //% block="Create a farmbot mission |of type %msn"
    export function startMission(msn: string) {
        resetMission()
        let time: number = input.runningTime()
        if (cloud_connected == false) { cloudConnect() }
        let str: string = station_id + ";" + station_token + ";" + msn + ";"
        sendAT("AT+CIPSEND=" + (str.length + 2), 2000)
        clearBuf()
        sendAT(str, 10) // upload data
        let tmp: string = readTimedBuf(3000)
        if (tmp.includes("+IPD")) {
            let cData = tmp.split(":")
            cData = cData[1].split(";")
            mission_id = cData[0]
            missionX = parseInt(cData[1])
            missionY = parseInt(cData[2])
        }
        cloudDisconnect()
    }


    /**
    * Connect to WROHellas cloud app and finalize mission.
    */
    //% block="Finalize mission |with ID %mission_id |and data %mission_data"
    export function endMission(mission_id: string, mission_data: string) {
        missionResult = -1
        if (cloud_connected == false) { cloudConnect() }
        let str: string = station_id + ";" + station_token + ";" + mission_id + ";" + mission_data + ";"
        sendAT("AT+CIPSEND=" + (str.length + 2), 3000)
        clearBuf()
        sendAT(str, 10) // upload data
        let tmp: string = readTimedBuf(3000)
        if (tmp.includes("+IPD")) {
            let cData = tmp.split(":")
            cData = cData[1].split(";")
            missionResult = parseInt(cData[1])
        }
        cloudDisconnect()
    }






    /**
    * Returns mission ID
    */
    //% block="mission ID"
    export function getMissionID() {
        return mission_id
    }

    /**
    * Returns mission X
    */
    //% block="mission X"
    export function getMissionX() {
        return missionX
    }

    /**
    * Returns mission Y
    */
    //% block="mission Y"
    export function getMissionY() {
        return missionY
    }


    /**
    * Returns mission result (if applied) [0 for false / 1 for correct]
    */
    //% block="mission result"
    export function getMissionResult() {
        return missionResult
    }


    /**
    * Returns true for valid mission ID or false for invalid
    */
    //% block="valid mission ID?"
    export function validMissionID() {
        if (mission_id.includes("ERROR") || mission_id.includes("error") || mission_id == null) {
            return false
        } else { return true }
    }


    /**
    * Returns true for valid mission result or false for invalid
    */
    //% block="valid mission result?"
    export function validMissionResult() {
        if (missionResult == 0 || missionResult == 1) {
            return true
        } else { return false }
    }


}