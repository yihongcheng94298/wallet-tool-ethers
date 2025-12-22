import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteObfuscateFile } from 'vite-plugin-obfuscator'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        // viteObfuscateFile({
        //     compact: true,
        //     controlFlowFlattening: false,
        //     deadCodeInjection: false,
        //     debugProtection: false,
        //     debugProtectionInterval: 0,
        //     disableConsoleOutput: false,
        //     include: [/\.js$/],
        //     identifierNamesGenerator: 'hexadecimal',
        //     log: false,
        //     numbersToExpressions: false,
        //     renameGlobals: false,
        //     selfDefending: false,
        //     simplify: true,
        //     splitStrings: false,
        //     stringArray: true,
        //     stringArrayCallsTransform: false,
        //     stringArrayCallsTransformThreshold: 0.5,
        //     stringArrayEncoding: [],
        //     stringArrayIndexShift: true,
        //     stringArrayRotate: true,
        //     stringArrayShuffle: true,
        //     stringArrayWrappersCount: 1,
        //     stringArrayWrappersChainedCalls: true,
        //     stringArrayWrappersParametersMaxCount: 2,
        //     stringArrayWrappersType: 'variable',
        //     stringArrayThreshold: 0.75,
        //     unicodeEscapeSequence: false
        // })
    ],
    server: {
        host: '0.0.0.0'
    },
    define: {
        'process.env': {},
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: false,
        __INTLIFY_PROD_DEVTOOLS__: false
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})
