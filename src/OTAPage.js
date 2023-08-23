import React, {useEffect,useRef, useState} from 'react';
import {
    AppBar,
    Toolbar,
    Button,
    Grid,
    Typography,
} from '@mui/material';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import LinearProgress from '@mui/material/LinearProgress';
import {getPacketBytes} from './gextindex.js';
import getOTAFile from './getOTAFile.js';
import {bytesToHexString } from './gextindex'



const SERVICE_UUID = '0000ff10-0000-1000-8000-00805f9b34fb';
const CHAR_UUID = '0000ff11-0000-1000-8000-00805f9b34fb';


function OTAPage() {
    const [otaFile, setOtaFile] = useState(null);


    useEffect(() => {
        getOTAFile().then( (value) => setOtaFile(value));
    }, []);

    const [ACK, setACK] = useState([0,2,3]);
    const [characteristic, setCharacteristic] = useState(null);
    const [device, setDevice] =  useState(null)
    const [error,setError] = useState('Ready');
    const [sent, setSent] = useState(0); // 已发送数据大小
    const [total, setTotal] = useState(0.001); // 总大小
    const progress = Math.round((sent / total) * 100);
    const sentRef = useRef(0);
    const [isConnected, setIsConnected] = useState(false);
    const [rerenderToggle, setRerenderToggle] = useState(false);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const toggleRerender = () => {
        setRerenderToggle((prevToggle) => !prevToggle);
    };



    const startScan = async () => {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Lumaflex' }],
                optionalServices: [SERVICE_UUID]
            });
            setDevices([device]);
        } catch (error) {
            console.log('Error scanning for devices:', error);
        }
    };

    const connectToDevice = async () => {
        try {
            if (selectedDevice) {
                if (!isConnected) {
                    // Connect device
                    // ...
                    await selectedDevice.gatt.connect();
                    setDevice(device);
                    const service = await selectedDevice.gatt.getPrimaryService(SERVICE_UUID);
                    // 获取特征值
                    const characteristic = await service.getCharacteristic(CHAR_UUID);
                    setCharacteristic(characteristic);
                    setError('Connected sucessfully.');
                    // 其他代码
                } else {
                    // Disconnect device
                    // ...
                    selectedDevice.gatt.disconnect();
                }
                toggleRerender(); // 触发重新渲染
            }
        } catch (error) {
            console.log('Error connecting/disconnecting device:', error);
            setError('Try again Error occurred while requesting Bluetooth device:' + error);
        }
    };

    const notify = async (characteristic) => {
        let ackArray=[];   // Declare ackArray outside of the event listener
        await characteristic.startNotifications();
        new Promise(resolve =>
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const dataView = new DataView(event.target.value.buffer);
                const ackArray = new Uint8Array(dataView.buffer);
                setError(bytesToHexString(ackArray));
                // console.log("bytesToHexString:"+bytesToHexString(ackArray));
                return resolve(ackArray);
            })
        ).then((ackArray) => {;
            setACK(ackArray);// Use ackArray in setACK after the event listener has executed
            // console.log("ackArray:"+ackArray);
        })
        ;}

// 启动
    const startOTA = async () => {
        const type = 0x01; // 固件下载
// 总长度
        const length = otaFile.byteLength;
        setTotal(length);
        console.log(length);
        //39192
// 构建启动命令

        const data = new Uint8Array([
            0xF1, // opcode
            type, // 总长度
            // 检验和 (省略)
        ]);
        // 构建启动命令

        // 写入数据
        try {
            if(characteristic){
                await characteristic.writeValueWithoutResponse(data);
                setACK([0xFC,0xF1,0X00]);
                setError("Start OTA");
                console.log(ACK)
            }
        } catch (error) {
            console.error('Start OTA:', error);
        }
    }


// 使用
    const  OtaProcess = async (characteristic) => {
        const PACKET_SIZE = 20;// 二进制数组
        const delay = 5; // ms
        console.log(characteristic)
        // for(let i = 0; i < 100; i += PACKET_SIZE) {
        for (let i = 0; i < otaFile.byteLength; i += PACKET_SIZE) {
            const packets = [1,2,2,3,4,5,6,7,8,9,10,11,12,12,34,56,78,90,10];
            await new Promise(resolve => setTimeout(resolve, delay));
            packets.push(packets);
            // 直接在循环内发送
            await sendPacket(i, packets,characteristic);
            console.log(i);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        await finishOTA();

    }

    const sendPacket = async(index, packet,characteristic) => {
        const packetBytes= new Uint8Array(packet);

        const data = new Uint8Array([
            index,  // 2字节索引
            ...packetBytes // 数据
        ]);
        if(characteristic){
            try {
                sentRef.current += packetBytes.length;
                // 发送data
                await characteristic.writeValueWithoutResponse(data);

            } catch (error) {
                console.error('Error occurred while sending packet:', error);
            }
        }
    };
    const finishOTA = async () => {
        // 构建结束命令
        const data = new Uint8Array([
            0xF3, 0x01, 0x00 // 总长度
        ]);
        try {
            await characteristic.writeValueWithoutResponse(data);
            setError(" OTA Finished");
            setACK([0xF3,0x01,0X00]);
            // await device.gatt.disconnect();
        }catch (e) {
            console.error('Error occurred while finished OTA:', e);
            setError('Error occurred while finished OTA:' + e);
        }

    }

    const handleDeviceSelection = (device) => {
        setSelectedDevice(device);
        setIsConnected(device.isConnected);
        toggleRerender(); // 触发重新渲染
    };

    useEffect(() => {
        const handleConnectionStatus = () => {
            setIsConnected(selectedDevice.isConnected);
            toggleRerender(); // 触发重新渲染
        };

        if (selectedDevice) {
            handleDeviceSelection(selectedDevice);
            selectedDevice.addEventListener('gattserverdisconnected', handleConnectionStatus);
            setIsConnected(selectedDevice.isConnected);
            toggleRerender(); // 触发重新渲染
        }

        return () => {
            if (selectedDevice) {
                selectedDevice.removeEventListener('gattserverdisconnected', handleConnectionStatus);
            }
        };
    }, [selectedDevice]);
    useEffect(() => {
        if (ACK[1]==0xF1 && ACK[2]==0x00 && characteristic) {
            OtaProcess(characteristic);
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
            }, 5);
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
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">Bluetooth Device OTA</Typography>
                </Toolbar>
            </AppBar>
            <Grid container spacing={3} p={3}>
                <Grid item xs={12} sm={12}>
                    <Button variant="outlined" onClick={startScan}>Connect Device</Button>
                    <div style={{ marginTop: '24px',marginBottom:'24px' }}>
                        {devices.map((device) => (
                            <div
                                style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}
                                key={device.id}
                                onClick={() => handleDeviceSelection(device)}
                            >
                                <BluetoothIcon />
                                <Typography sx={{ marginLeft: '12px' }}>
                                    {device.name}
                                </Typography>
                            </div>
                        ))}
                    </div>
                    {selectedDevice && (
                        <div>
                            <Button sx= {{ marginBottom:'24px'}} variant="contained" onClick={connectToDevice}>
                                {isConnected ? 'Disconnect' : 'Connect'}
                            </Button>
                        </div>
                    )}
                    <Button variant="outlined" onClick={startOTA}>Start OTA</Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography>{progress}%</Typography>
                    <Typography>{error}</Typography>
                </Grid>
            </Grid>
        </div>
    );
}

export default OTAPage;