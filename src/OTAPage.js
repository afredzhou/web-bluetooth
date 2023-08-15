import React, { useState, useEffect } from 'react';
import { Button } from '@material-ui/core';
const SERVICE_UUID = '0000ff10-0000-1000-8000-00805f9b34fb';

// OTA 特征 UUID
const CHAR_UUID = '0000ff11-0000-1000-8000-00805f9b34fb';
// OTA文件ArrayBuffer
async function getOTAFile() {
    const firmwareFilePath = '/ZLD-05-T.bin';
    const firmwareResponse = await fetch(firmwareFilePath);
    const firmwareData = await firmwareResponse.arrayBuffer();
    return firmwareData;
}

function OTAPage() {
    const [otaFile, setOtaFile] = useState(null);

    useEffect(() => {
        getOTAFile().then(setOtaFile);
    }, []);

    const [device, setDevice] = useState(null);
    const [mtu, setMtu] = useState(20);
    const [sent, setSent] = useState(0); // 已发送数据大小
    const [total, setTotal] = useState(0); // 总大小
    const [server, setServer] = useState(null);

    const startScan = async () => {
        try {
            // 请求设备连接
            const scannedDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Lumaflex' }]
            });

            setDevice(scannedDevice);
            const server = await device.gatt.connect();
            // const server = await navigator.bluetooth.connectGATT(scannedDevice);
            setServer(server);

            // 获取MTU大小
            const mtuResp = await server.write(/* OTA start cmd */);
            setMtu(mtuResp.mtu);

        } catch (error) {
            console.error('Error occurred while requesting Bluetooth device:', error);
        }
    };



// 启动
    const startOTA = async () => {
        // 构建启动命令
        const data = Uint8Array.of(0xF1, 0x01, 0x00, 0x00, 0x00);
        const service = await server.getPrimaryService(SERVICE_UUID);

        // 获取特征值
        const characteristic = await service.getCharacteristic(CHAR_UUID);

        // 写入数据
        await characteristic.writeValue(data);
    }
    const sendPacket = () => {

        let sent = 0;
        const start = sent;
        const end = Math.min(start + mtu, total);
        const data = otaFile.slice(start, end);

        // 发送数据包
        sent += data.length;
        setSent(sent);
    };

    const finishOTA = async () => {
        // 构建结束命令
        const data = Uint8Array.of(0xF3, 0x01, 0x00);

        await server.write(SERVICE_UUID, CHAR_UUID, data);
    }


    useEffect(() => {
        let timer;
        if (sent < total) {
            timer = setInterval(sendPacket, 100);
        } else {
            // 发送结束指令
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [sent]);

    return (
        <div>
            <div>
                <Button variant="outlined" onClick={startScan}>Connect Device</Button>
                <Button variant="outlined" onClick={startOTA}>startOTA</Button>
                <Button variant="outlined" onClick={sendPacket}>OTA</Button>
                <Button variant="outlined" onClick={finishOTA}>finishOTA</Button>
            </div>
            <progress value={sent} max={total}></progress>
        </div>
    );
}

export default OTAPage;