const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: ['./index.ts'],
    output: {
        filename: 'test.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/, use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        inline: false
    }
}