import { default as SpotifyJS } from 'spotify-web-api-js'
import { default as SpotifyNode } from 'spotify-web-api-node'

let window: any

export const accessToken =
  process?.env.ACCESS_TOKEN ||
  window.localStorage.getItem('ACCESS_TOKEN')

type SpotifyClientJS = InstanceType<typeof SpotifyJS>
type SpotifyClientNode = InstanceType<typeof SpotifyNode>

let spotify: SpotifyClientJS & SpotifyClientNode
if (process) {
  spotify = new SpotifyNode({ accessToken }) as typeof spotify
} else {
  const spotifyJS = new SpotifyJS()
  spotifyJS.setAccessToken(accessToken)
  spotify = spotifyJS as typeof spotify
}

export default spotify