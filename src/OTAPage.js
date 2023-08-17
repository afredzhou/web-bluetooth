import React, {useEffect, useState} from 'react';
import {Button} from '@material-ui/core';
import {getPacketBytes} from './gextindex.js';
import {getOTAFile} from './getOTAFile.js';
import  calculateChecksum from './calculateChecksum.js'
import {bytesToHexString } from './gextindex'
const SERVICE_UUID = '0000ff10-0000-1000-8000-00805f9b34fb';
const CHAR_UUID = '0000ff11-0000-1000-8000-00805f9b34fb';

function OTAPage() {
    const [otaFile, setOtaFile] = useState(null);

    useEffect(() => {
        getOTAFile().then( (value) => setOtaFile(value));
    }, []);
    const [ACK, setACK] = useState([0x12, 0x34, 0x56]);
    const [characteristic, setCharacteristic] = useState(null);
    const [device, setDevice] = useState(null);
    const [sent, setSent] = useState(0); // 已发送数据大小
    const [total, setTotal] = useState(0); // 总大小
    const [server, setServer] = useState(null);
    const [isFinished, setisFinished] = useState(false);
    const startScan = async () => {
        try {
            const scannedDevice = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Lumaflex' }],
                optionalServices: [SERVICE_UUID]
            });
            if (scannedDevice) {
                setDevice(scannedDevice);
                const server = await device.gatt.connect();
                setServer(server);

                // 其他代码

            } else {
                console.error('User canceled the request or no Bluetooth device was selected.');
            }
        } catch (error) {
            console.error('Error occurred while requesting Bluetooth device:', error);
        }
    };


// 启动
    const startOTA = async () => {
        const type = 0x01; // 固件下载

// 总长度
        const length = otaFile.byteLength;
        setTotal(length);
        // 4字节小端序长度
        const lengthBytes = new Uint8Array(4);

        lengthBytes[0] = length & 0xFF;
        lengthBytes[1] = (length >> 8) & 0xFF;
        lengthBytes[2] = (length >> 16) & 0xFF;
        lengthBytes[3] = (length >> 24) & 0xFF;

        console.log(bytesToHexString(lengthBytes));     //39500
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
        // 获取特征值
        const characteristic = await service.getCharacteristic(CHAR_UUID);
        setCharacteristic(characteristic);
        // console.log(characteristic);
        await notify(characteristic);
       // console.log(newData);
        // 写入数据
        try {
            if(characteristic.properties.writeWithoutResponse){
                await characteristic.writeValueWithoutResponse(newData);
            }

        } catch (error) {
            console.error('     Start OTA:', error);
        }
    }

    const notify = async (characteristic) => {
     await characteristic.startNotifications();
     await characteristic.addEventListener('characteristicvaluechanged', (event) => {
         const dataView = new DataView(event.target.value.buffer);
         const response = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
         console.log(dataView);
         const responseArray = Object.values(response);
         // 将响应数据设置为 ACK 状态的新值
         setACK(responseArray);
         console.log(" ACK回调 :"+bytesToHexString(responseArray));

     });

 }
// 使用
    const  OtaProcess = async () => {
        const PACKET_SIZE = 20;// 二进制数组
        const delay = 100; // ms
        // for(let i = 0; i < 60; i += PACKET_SIZE) {
        for (let i = 0; i <= otaFile.byteLength; i += PACKET_SIZE) {
            const packets = [];
            const start = i;
            const end = start + PACKET_SIZE;
            const packet = otaFile.slice(start, end);
            await new Promise(resolve => setTimeout(resolve, delay));

            if (i === otaFile.byteLength) {
                setisFinished(true);
                console.log('Otaprocess finished');
                break;
            }
            packets.push(packet);
            // 直接在循环内发送
            await sendPacket(i, packet);
            console.log(i);
        }
        await finishOTA();

    }

    const sendPacket = async(index, packet) => {
        const packetBytes= new Uint8Array(packet);
        console.log(bytesToHexString(packetBytes));
        const newIndex= getPacketBytes(index);
        const data = new Uint8Array([
            ...newIndex,  // 2字节索引
            ...packetBytes // 数据
        ]);

        const checksum = calculateChecksum(data);// 计算并设置校验和
        const newData = new Uint8Array([...data, checksum]);
        try {
            // 发送data
            await characteristic.writeValueWithoutResponse(newData);
        } catch (error) {
            console.error('Error occurred while sending packet:', error);
        }
        setSent(sent + packetBytes.length);
    };
    const finishOTA = async () => {

            // 构建结束命令
        const finishOTAData = [0xF3, 0x01, 0x00,];
          const checksum = calculateChecksum(finishOTAData);// 计算并设置校验和
            const newData = new Uint8Array([...finishOTAData, checksum]);

           try {
               await characteristic.writeValueWithoutResponse(newData);
               // await device.gatt.disconnect();
               console.log('OTA finish button pressed');
           }catch (e) {
               console.error('Error occurred while finished OTA:', e);
           }
            
        }
    useEffect(() => {
        let timer =0;
        if (sent < total) {
            timer = setInterval(() => {
                // 在此处执行发送操作
            }, 100);
        } else {
            // 发送结束指令
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [ isFinished,sent, total]);

    return (
        <div>
            <div>
                <Button variant="outlined" onClick={startScan}>Connect Device</Button>
                <Button variant="outlined" onClick={startOTA}>startOTA</Button>
                <Button variant="outlined" onClick={OtaProcess}>OTA</Button>
                <Button variant="outlined" onClick={finishOTA}>finishOTA</Button>
            </div>
            <progress value={sent} max={total}></progress>
        </div>
    );
}

export default OTAPage;