import { babel } from '@rollup/plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
export default [
    {
        input: './src/index.ts',
        output: [{
            format: 'cjs',
            file: './dist/index.cjs',
            banner: require('./scripts/copyright')
        }],
        plugins: [
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "esnext"
                    }
                }
            }),
            nodeResolve(),
            commonjs(),
            babel({ babelHelpers: 'bundled' })
        ],
        external: ['tslib', 'k8w-extend-native', /core\-js/]
    },
    {
        input: './src/index.ts',
        output: [{
            format: 'es',
            file: './dist/index.mjs',
            banner: require('./scripts/copyright')
        }],
        plugins: [
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "esnext"
                    }
                }
            }),
            nodeResolve(),
            commonjs(),
            babel({ babelHelpers: 'bundled' })
        ],
        external: ['tslib', 'k8w-extend-native', /core\-js/]
    }
]