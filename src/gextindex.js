export  default function getPacketBytes(index) {

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