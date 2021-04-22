export interface TransportOptions {
    /**
     * callApi超时时间（单位：毫秒）
     * `undefined` 代表不限
     * 默认：`undefined`
     */
    timeout?: number;

    /**
     * 进度事件
     * @param progress - 0~1
     */
    onProgress?: (progress: number) => void;
}