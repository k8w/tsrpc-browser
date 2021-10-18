declare module 'mongodb' {
    // 在浏览器，ObjectID 被自动反序列化为字符串
    export type ObjectId = string;
    export type ObjectID = string;
}