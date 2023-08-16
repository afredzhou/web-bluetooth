 async function getOTAFile() {
    const firmwareFilePath = '/ZLD-05-T.bin';
    const firmwareResponse = await fetch(firmwareFilePath);
    return await firmwareResponse.arrayBuffer();
}

function calculateChecksum(data) {
    let sum = 0;

    for (let byte of data) {
        sum += byte;
    }

    return sum;
}

 module.exports = {
     getOTAFile,
     calculateChecksum
 };