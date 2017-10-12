const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: ['./Client.test.ts', './BinaryClient.test.ts'],
    // entry: ['./index.ts'],
    output: {
        filename: 'cases.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    resolveLoader: {
        modules: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, 'libs/LongFront/webpack-loaders')
        ]
    },
    module: {
        rules: [
            // {
            //     test: v => v.startsWith(path.resolve(__dirname, 'protocol')),
            //     loader: 'testloader'		//React-Router componentPath=XXX
            // },
            {
                test: /\.tsx?$/, use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    devServer: {
        contentBase: __dirname,
        inline: false,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3301',
                changeOrigin: true
            },
            '/bapi': {
                target: 'http://127.0.0.1:3302',
                pathRewrite: { '^/bapi': '' },
                changeOrigin: true
            }
        }
    }
}