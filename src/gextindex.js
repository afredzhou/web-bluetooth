const  getPacketBytes= (index)=> {

    const highByte = (index >> 8) & 0xFF;
    const lowByte = index & 0xFF;

    const bytes = new Uint8Array([
        0xF2,
        lowByte,
        highByte,
        //...data
    ]);

    return bytes;

}
// function bytesToHexString (byteArray) {
//     return byteArray.map(value => value.toString(16).toUpperCase().padStart(2, '0')).join('');
// }
const bytesToHexString  = (src) => {
    let stringBuilder = "";
    if (src === null || src.length <= 0) {
        return null;
    }
    for (let i = 0; i < src.length; i++) {
        let v = src[i] & 0xFF;
        let hv = v.toString(16);
        if (hv.length < 2) {
            stringBuilder += "0";
        }
        stringBuilder += hv;
    }
    return stringBuilder;
};

module.exports = {
    getPacketBytes,
    bytesToHexString
};