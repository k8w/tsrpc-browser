export default class BinaryTextCoder {
    static async encode(content: object): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>(rs => {
            let blob = new Blob([JSON.stringify(content)], { type: 'application/octet-stream' });
            let reader = new FileReader();
            reader.onload = () => {
                rs(reader.result as ArrayBuffer)
            }
            reader.readAsArrayBuffer(blob);
        })
    }

    static decode(buffer: ArrayBuffer): Promise<any> {
        return new Promise<ArrayBuffer>(rs => {
            let blob = new Blob([buffer]);
            let reader = new FileReader();
            reader.onload = () => {
                rs(JSON.parse(reader.result as any))
            }
            reader.readAsText(blob);
        })
    }
}