import { SavedTracksArtistIDs, getMySavedTracksArtistIDs } from './tbd'
import { ProfileInfo } from './tree-builder'
import { autoPaginate } from './pagination'
import fs from 'fs'
import Spotify from './main'

interface playListSimilarity { 
    playlistId: string,
    playlistSimilarityScore: number,
}

interface Similarity {
    playListSimilarityScores: playListSimilarity[],
    cumalitveSimilarityScore: number,
}

function intersectionSize(x: any[], y: any[]) : number { 
    return x.filter(value => y.includes(value)).length
}

function similarityScore(x: any[], y: any[]) {
    return intersectionSize(x, y)
}

async function getSimilarity(userSavedInfo: SavedTracksArtistIDs, profileInfo: ProfileInfo) {
    let similarity = { playListSimilarityScores: [], cumalitveSimilarityScore: 0 }
    const promises = profileInfo.playlistIds.map(async (playlistId) => {
        const playlist = await autoPaginate<SpotifyApi.PlaylistTrackObject>(Spotify.getPlaylistTracks as any, playlistId)
        const playListTrackIds = playlist.map(item => item.track.id) 
        const playListTrackArtistIds = playlist
            .map(item => (item.track as any).artists.map(artist => artist.id))
            .flat()
        similarity.playListSimilarityScores
            .push(similarityScore(userSavedInfo.trackIDs, playListTrackIds) + similarityScore(userSavedInfo.artistIDs, playListTrackArtistIds)) 
    })
    await Promise.all(promises)
    similarity.cumalitveSimilarityScore = similarity.playListSimilarityScores.reduce((x, y) => x + y, 0) 
    return similarity
}

async function blah() {
    const userSavedInfo = await getMySavedTracksArtistIDs()
    fs.readFileSync('profile.json')
    console.log(await getSimilarity(userSavedInfo, JSON.parse(fs.readFileSync('profile6.json').toString())))
}

blah()
