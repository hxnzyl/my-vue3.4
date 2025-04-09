//#node dev.js

import esbuild from 'esbuild'
import minimist from 'minimist'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// node中的命令函数通过process来获取参数
// .slice(2) 去掉 node dev.js
// = [ 'reactivity', '-f', 'esm' ]
const args = minimist(process.argv.slice(2))

// 由于 node 下的esm环境没有 __dirname，所以要自主获取
const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 打包的哪个项目
const target = args._[0] || 'reactivity'

// 打包后的模块化格式。cjs/esm/iife
const format = args.f || 'iife'

// 出口平台
const platform = 'browser'

// 入口文件
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)

// 出口文件
const outfile = resolve(
	__dirname,
	`../packages/${target}/dist/${target}${format == 'iife' ? '' : '.' + format}-${platform}.js`
)

// 入口 package.json
const pkg = require(`../packages/${target}/package.json`)

// 使用esbuild 打包
esbuild
	.context({
		// 入口文件
		entryPoints: [entry],
		// 出口文件
		outfile,
		// 依赖打包到一起
		bundle: true,
		// 打包哪个平台用
		platform,
		// 启动 sourcemap
		sourcemap: true,
		// cjs/esm/iife
		format,
		// 全局名称
		globalName: pkg.buildOptions.name
	})
	.then(function (ctx) {
		console.log('start dev')

		// 监控入口文件，持续打包
		return ctx.watch()
	})
