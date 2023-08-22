// OTA文件ArrayBuffer

async function getOTAFile() {
    const firmwareFilePath = 'https://f005.backblazeb2.com/file/Afred-Zhou/ZLD-05.bin';
    const firmwareResponse = await fetch(firmwareFilePath);
    return await firmwareResponse.arrayBuffer()
}




export default getOTAFile;