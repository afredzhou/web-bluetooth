// OTA文件ArrayBuffer
async function getOTAFile() {
     const firmwareFilePath = '/ZLD-05-T.bin';
     const firmwareResponse = await fetch(firmwareFilePath);
     return await firmwareResponse.arrayBuffer()
}




 module.exports = {
     getOTAFile,
 };