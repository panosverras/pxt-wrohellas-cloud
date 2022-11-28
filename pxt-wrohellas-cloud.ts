/**
 * MakeCode extension for WROHellas Cloud (https://wrohellas.gr)
 * 
 * This extension is based on ThingSpeak MakeCode extension
 */
//% color=#009bbb weight=150 icon="\uf1ae" block="WROHellas"
namespace WROHellasCloud {

    let ssid: string = null
    let pass: string = null
    let wcip: string = ""               /* Cloud server IP      */
    let wccp: string = ""               /* Cloud server port    */
    let rsid: string = ""               /* Unique station id    */

    let debug = false
    let CRLF = "\u000D\u000A"

    let debug_strings = [
        'ERROR;00;',                    // Could not connect to wifi
        'ERROR;01;',                    // Could connect to cloud server 
        'ERROR;02;',                    // Error while creating mission
        'ERROR;03;'                     // Error while finalising mission
    ]



    /**
    * WiFi init settings
    */
    //% block="WiFi settings (ESP8266)|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID %w_ssid|Wifi PASS %w_pass"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% w_ssid.defl=your_ssid
    //% w_pass.defl=your_pw
    export function wifiSettings(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, w_ssid: string, w_pass: string) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        serial.setRxBufferSize(128)
        serial.setTxBufferSize(128)
        ssid = w_ssid
        pass = w_pass
    }



    /**
    * Cloud init settings
    */
    //% block="Cloud settings (WROHellas)| URL/IP %ip| Port %port| Station ID %sid"
    //% ip.defl="server ip"
    //% port.defl="server port"
    //% sid.defl="unique station id"
    export function cloudSettings(ip: string, port: string, sid: string) {
        wcip = ip
        wccp = port
        rsid = sid
    }



    /**
    * Connects to WiFi router
    */
    //% block="WiFi connect"
    export function wifiConnect() {
        clearBuffer()
        writeBuffer("AT+RESTORE", 3000) // restore to factory settings
        clearBuffer()
        writeBuffer("AT+RST", 2000) // reset
        clearBuffer()
        writeBuffer("ATE0", 500)    // disable echo mode
        clearBuffer()
        writeBuffer("AT+CWMODE=1", 500) // set to STA mode
        clearBuffer()
        writeBuffer("AT+CIPMODE=0", 500) //
        clearBuffer()
        if (rsid!="") {
            writeBuffer("AT+CWHOSTNAME=\"" + rsid + "\"", 500)
            clearBuffer()
        }
        writeBuffer("AT+CIPMUX=0", 500) //
        clearBuffer()
        writeBuffer("AT+CWAUTOCONN=1", 500) // enable reconnecting when connection is dropped
        clearBuffer()
        writeBuffer("AT+SLEEP=0", 500) // disables autosleep
        clearBuffer()
        writeBuffer("AT+CWJAP=\"" + ssid + "\",\"" + pass + "\"", 5000) // connect to Wifi router
        clearBuffer()
    }


    /**
    * Connects to WiFi router
    */
    //% block="WiFi connected?"
    //% blockGap=8
    // Checks if wifi properly connected
    export function wifiStatus(): boolean {
        basic.pause(1000)
        let cData: string[]
        clearBuffer()
        writeBuffer("AT+CIFSR", 10)
        let s = readBuffer(3000)
        if (!s.includes(CRLF)) { s = " " + CRLF + " " }
        cData = s.split(CRLF)
        if (cData[0].includes("+CIFSR:STAIP") && !cData[0].includes("0.0.0.0")) {
            return true
        } else { return false }
        //if (s.includes("0.0.0.0")) { return false } else { return true }
    }




    /**
    * Connect to WROHellas cloud app and start a new mission.
    */
    //% block="Create a mission |of type %msn"
    export function startMission(msn: string) {
        if (wifiStatus() == false) { return debug_strings[0] }      // Checking for an active wifi connection
        clearBuffer()
        cloudDisconnect()                                           // Closing any active connection with cloud server
        let sstring = "AT+CIPSTART=\"TCP\",\"" + wcip + "\"," + wccp // + "," + "10"
        writeBuffer(sstring, 100)                                  // connect to cloud server
        let s = readBuffer()
        if (!s.includes("CONNECT")) { return debug_strings[1] }     /** && s.includes("OK")) OR s.includes("ALREADY CONNECTED") {  */

        sstring = rsid + ";" + msn + ";"
        writeBuffer("AT+CIPSEND=" + (sstring.length + 2), 2000)
        clearBuffer()
        writeBuffer(sstring, 10) // upload data
        let tmp = readBuffer(3000)
        if (tmp.includes("+IPD")) {
            let cData = tmp.split(":")
            cloudDisconnect()
            return cData[1]
        } else { 
            cloudDisconnect()
            return debug_strings[2] 
        }
    }



    /**
    * Connect to WROHellas cloud app and complete mission.
    */
    //% block="Complete mission |with ID %mission_id |and data %mission_data"
    export function completeMission(mission_id: string, mission_data: string) {
        if (wifiStatus() == false) { return debug_strings[0] }      // Checking for an active wifi connection
        clearBuffer()
        cloudDisconnect()                                           // Closing any active connection with cloud server
        let sstring = "AT+CIPSTART=\"TCP\",\"" + wcip + "\"," + wccp // + "," + "10"
        writeBuffer(sstring, 100)                                  // connect to cloud server
        let s = readBuffer()
        if (!s.includes("CONNECT")) { return debug_strings[1] }     /** && s.includes("OK")) OR s.includes("ALREADY CONNECTED") {  */

        let str: string = mission_id + ";" + mission_data + ";"
        writeBuffer("AT+CIPSEND=" + (str.length + 2), 3000)
        clearBuffer()
        writeBuffer(str, 10) // upload data
        let tmp: string = readBuffer(3000)
        if (tmp.includes("+IPD")) {
            let cData = tmp.split(":")
            cloudDisconnect()
            return cData[1]
        } else { 
            cloudDisconnect()
            return debug_strings[3] 
        }
    }






    /* ------------------------------------------------------------------------------------------- */


    


    // Reads from serial rx buffer
    function readBuffer(timeout: number = 5000): string {
        basic.pause(1000)
        let time: number = input.runningTime()
        let sData = ""
        let s = ""
        while (true) {
            s = serial.readString()
            if (s === "") { break } else { sData += s }
            if (input.runningTime() - time > timeout) { break }
        }
        if (debug == true) { basic.showString(sData) }
        return sData
    }


    // Reads from serial rx buffer
    function readBufferUntil(matchString: string, timeout: number = 5000): string {
        basic.pause(1000)
        let time: number = input.runningTime()
        let sData = ""
        let s = ""
        while (true) {
            s = serial.readString()
            if (s !== "") { sData += s }
            if (input.runningTime()-time>timeout || sData.includes(matchString) == true) { break }
        }
        if (debug == true) { basic.showString(sData) }
        return sData
    }


    // write to serial tx buffer (ends with CR+LF)
    function writeBuffer(command: string, wait: number = 100) {
        //serial.writeString(command + "\u000D\u000A")
        serial.writeString(command + CRLF)
        if (debug == true) { basic.showString(command) }
        basic.pause(wait)
    }


    // Clears serial rx buffer
    function clearBuffer() {
        basic.pause(500)
        let b: Buffer = serial.readBuffer(0)
    }



    /**
    * Disconnects from WROHellas cloud server
    */
    //% block="Cloud disconnect"
    function cloudDisconnect() {
        writeBuffer("AT+CIPCLOSE", 1000)
        clearBuffer()
    }

}