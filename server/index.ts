import { createApp } from './app'
import { createRuntimeConfig } from './config'

const config = createRuntimeConfig()
const app = createApp(config)

app.listen(config.port, config.host, () => {
	console.log(`LocalArt tool server listening at http://${config.host}:${config.port}`)
})
