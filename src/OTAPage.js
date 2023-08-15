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

// 计算校验和
function calculateChecksum(data) {
    let sum = 0;

    for (let byte of data) {
        sum += byte;
    }

    return sum;
}

function calculateAndSetChecksum(data) {
    const checksum = calculateChecksum(data);
    data[data.length - 1] = checksum;
    return checksum;
}
function OTAPage(value) {
    const [otaFile, setOtaFile] = useState(null);

    useEffect(() => {
        getOTAFile().then(setOtaFile);
    }, []);
    const [ACK, setACK] = useState([0x12, 0x34, 0x56]);
    const [service, setService] = useState(null);
    const [characteristic, setCharacteristic] = useState(null);
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
            const server = await device.gatt;
            setServer(server);
            await device.connect();
            await device.startNotifications();
            await device.addEventListener('characteristicvaluechanged', (event) => {

                const response = Array.from(event.target.value);

                // 将响应数据设置为 ACK 状态的新值
                setACK(response);
                console.log(ACK.toString())

            });


            // 获取MTU大小
            const mtuResp = await server.write(/* OTA start cmd */);
            setMtu(mtuResp.mtu);

        } catch (error) {
            console.error('Error occurred while requesting Bluetooth device:', error);
        }
    };



// 启动
    const startOTA = async () => {
        const type = 0x01; // 固件下载

// 总长度
        const length = otaFile.byteLength;
        const lengthBytes = new Uint8Array(4);

        lengthBytes[0] = length;
        lengthBytes[1] = length >> 8;
        lengthBytes[2] = length >> 16;
        lengthBytes[3] = length >> 24;

// 构建启动命令
        const data = new Uint8Array([
            0xF1, // opcode
            type,
            ...lengthBytes, // 总长度
            // 检验和 (省略)
        ]);
        // 构建启动命令
        const checksum = calculateChecksum(data);
        const newData = new Uint8Array([...data, checksum]);
        const service = await server.getPrimaryService(SERVICE_UUID);
        setService(service);
        // 获取特征值
        const characteristic = await service.getCharacteristic(CHAR_UUID);
        setCharacteristic(characteristic);
       console.log(newData);
        // 写入数据
        await characteristic.writeValueWithoutResponse(newData);
    }


    const sendPacket = async(index, packet) => {

        const data = new Uint8Array([
            0xF2, // 传输opcode
            index, // 2字节索引
            ...packet // 数据
        ]);

        // 计算并设置校验和
        calculateAndSetChecksum(data);
        await characteristic.writeValueWithoutResponse(data);
        // 发送data
        setSent(sent + packet.length);
    };

// 使用
    const  Otaprocess = async (otaFile) => {
        const packets = otaFile;
        for (let i = 0; i < packets.length; i++) {
            await sendPacket(i, packets[i]);
        }
    }
        const finishOTA = async () => {
            // 构建结束命令
            const data = Uint8Array.of(0xF3, 0x01, 0x00);

            await server.writeValueWithoutResponse(data);
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
                <Button variant="outlined" onClick={Otaprocess}>OTA</Button>
                <Button variant="outlined" onClick={finishOTA}>finishOTA</Button>
            </div>
            <progress value={sent} max={total}></progress>
        </div>
    );
}

export default OTAPage;