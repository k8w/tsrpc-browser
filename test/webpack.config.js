const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
    plugins: [new HtmlWebpackPlugin({
        template: 'index.html'
    })],
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        inline: false
    }
}