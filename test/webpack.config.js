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
                test: /\.ts$/,
                // exclude: /(node_modules|bower_components)/,
                use: [
                    // {
                    //     loader: 'babel-loader',
                    //     options: {
                    //         presets: [
                    //             [
                    //                 "@babel/preset-env",
                    //                 {
                    //                     useBuiltIns: "entry",
                    //                     targets: { chrome: "30", ie: "8" },
                    //                     corejs: '3.14.0'
                    //                 }
                    //             ]
                    //         ],
                    //         plugins: ['@babel/plugin-transform-runtime']
                    //     }
                    // },
                    {
                        loader: 'ts-loader'
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
    }
}