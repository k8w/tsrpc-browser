const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: ['./index.ts'],
    output: {
        filename: 'test.js'
    },
    resolve: {
        extensions: ['', '.ts', '.tsx', '.js', '.mjs', '.cjs'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'babel-loader',
                    },
                    {
                        loader: 'ts-loader'
                    },
                ]
            },
            {
                test: /\.[cm]?js$/,
                exclude: /core\-js/,
                use: [
                    {
                        loader: 'babel-loader',
                    },
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
    },
    optimization: {
        minimize: false
    },
    devtool: false
}