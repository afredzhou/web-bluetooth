import React, {useEffect,useRef, useState} from 'react';
import {
    Button,
    Typography,
} from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import getOTAFile from './getOTAFile.js';
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
    const [server, setServer] = useState(null);
    const [error,setError] = useState('Ready');
    const [sent, setSent] = useState(0); // 已发送数据大小
    const [total, setTotal] = useState(0.001); // 总大小
    const progress = Math.round((sent / total) * 100);
    const sentRef = useRef(0);
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

        console.log(bytesToHexString(length));     //39500
// 构建启动命令

        const data = new Uint8Array([
            0xF1, 0x02,0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00

        ]);
        // 构建启动命令
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
                await characteristic.writeValueWithoutResponse(data);
                setError('OTA Started');
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
         const ackArray = new Uint8Array(dataView.buffer);
         // 将响应数据设置为 ACK 状态的新值
         setACK(responseArray);
         setError(bytesToHexString(ackArray));
         console.log(" ACK回调 :"+bytesToHexString(responseArray));

     });

 }
// 使用
    const  OtaProcess = async () => {
        const PACKET_SIZE = 20;// 二进制数组
        const delay = 5; // ms
        setError('OTA Proessing');
        // for(let i = 0; i < 60; i += PACKET_SIZE) {
        for (let i = 0; i <= otaFile.byteLength; i += PACKET_SIZE) {
            const packet = [];
            await new Promise(resolve => setTimeout(resolve, delay));
            await sendPacket(i, packet);
            console.log(i);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        await finishOTA();

    }

    const sendPacket = async(index, packet) => {
        const packetBytes= new Uint8Array(packet);
        console.log(bytesToHexString(packetBytes));

        const data = new Uint8Array([
            index,  // 2字节索引
            ...packetBytes // 数据
        ]);


        const newData = new Uint8Array([...data]);
        sentRef.current += 20;
        try {
            // 发送data
            await characteristic.writeValueWithoutResponse(newData);

        } catch (error) {
            console.error('Error occurred while sending packet:', error);
        }
    };
    const finishOTA = async () => {

            // 构建结束命令
        const finishOTAData = [0x00, 0x00, 0x00,];

            const newData = new Uint8Array([...finishOTAData]);

           try {
               await characteristic.writeValueWithoutResponse(newData);
               setError('OTA finished')
               setTimeout(() => {  sentRef.current = 0; }, 2000);
               // await device.gatt.disconnect();
               console.log('OTA finish button pressed');
           }catch (e) {
               console.error('Error occurred while finished OTA:', e);
           }
            
        }
    useEffect(() => {
        if (ACK[1]==0xF1 && ACK[2]==0x00 && characteristic) {
            setError('OTA started')
        };
        if(ACK[0]=0xF3&&ACK[1]==0x01 ){
            setError('OTA finished')
            setTimeout(() => {  sentRef.current = 0; }, 1000);
        };
        if (ACK[0]==0xFC && ACK[2]!==0x00 ) {
            setError('OTA failed')
        };
        if (characteristic) {
            // 这里可以放置需要在 characteristic 发生变化时执行的代码
            notify(characteristic);}
        // console.log("ACK updated:"+ACK);
        console.log("ACK updated:"+bytesToHexString(ACK));
    }, [ACK,characteristic]);
    useEffect(() => {
        let timer;
        if (sentRef.current < total) {
            timer = setInterval(() => {
                // 在此处执行发送操作
                setSent(sentRef.current);  // 这里可能需要更新 sentRef.current 的值
                clearInterval(timer);  // 清除 setInterval
            }, 100);
            timer = setInterval(() => {
                // 在此处执行发送操作
                // 使用 sentRef.current 来更新进度条的值
                setError('');  // 这里可能需要设置错误信息
                clearInterval(timer);  // 清除 setInterval
            }, 1000);
        }
        return () => {
            clearInterval(timer);  // 在组件卸载或重新渲染时清除 setInterval
        };
    }, [sent, total]);

    return (
        <div>
            <div>
                <Button variant="outlined" onClick={startScan}>Connect Device</Button>
                <Button variant="outlined" onClick={startOTA}>startOTA</Button>
                <Button variant="outlined" onClick={OtaProcess}>OTA</Button>
                <Typography>{error}</Typography>
            </div>
            <LinearProgress variant="determinate" value={progress} />
            <Typography>{progress}%</Typography>
        </div>
    );
}

export default OTAPage;