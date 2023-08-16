// export default function calculateChecksum(data) {
//     let sum = 0;
//
//     for (let byte of data) {
//         sum += byte;
//     }
//
//     return sum;
// }
const calculateChecksum = (data) => {
    let totalValue = 0;
    const bitmask = 0x00000000FF;
    for (let i = 0; i < data.length; i++) {
        totalValue += data[i] & 0xff;
    }
    return totalValue & bitmask;
};
const OTA_PACKET_CS_LENGTH = 1;
const getOTAStartCommandData = (mOTAData) => {
    console.log("Enter getOTAStartCommandData");
    const ret = [0xF1, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00];
    const total_length = new Array(4).fill(0);
    if (mOTAData !== null) {
        const length = mOTAData.length;
        total_length[3] = (length & 0xFF000000) >> 24;
        total_length[2] = (length & 0x00FF0000) >> 16;
        total_length[1] = (length & 0x0000FF00) >> 8;
        total_length[0] = length & 0x000000FF;
        for (let i = 0; i < total_length.length; i++) {
            ret[i + 2] = total_length[i];
        }
        ret[ret.length - OTA_PACKET_CS_LENGTH] = calculateChecksum(ret);
    } else {
        console.log("mOTAData is null");
    }
    console.log("Leave getOTAStartCommandData");
    return ret;
};
3

export default calculateChecksum ;