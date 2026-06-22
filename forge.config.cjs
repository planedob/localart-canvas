const { MakerDeb } = require('@electron-forge/maker-deb')
const { MakerSquirrel } = require('@electron-forge/maker-squirrel')
const { MakerZIP } = require('@electron-forge/maker-zip')

module.exports = {
	packagerConfig: {
		asar: { unpack: '**/.desktop/utility.cjs' },
		name: 'LocalArt Canvas',
		executableName: 'localart-canvas',
		extraResource: ['dist', 'config/comfyui-workflow.example.json'],
		ignore: [
			/^\/node_modules($|\/)/,
			/^\/client($|\/)/,
			/^\/server($|\/)/,
			/^\/desktop($|\/)/,
			/^\/docs($|\/)/,
			/^\/scripts($|\/)/,
			/^\/canvas($|\/)/,
			/^\/out($|\/)/,
			/^\/dist($|\/)/,
		],
	},
	makers: [
		new MakerSquirrel({ name: 'localart_canvas' }),
		new MakerZIP({}, ['darwin', 'linux']),
		new MakerDeb({
			options: {
				maintainer: 'LocalArt Canvas contributors',
				homepage: 'https://github.com/planedob/localart-canvas',
			},
		}),
	],
}
