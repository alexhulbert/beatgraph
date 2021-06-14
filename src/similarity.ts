import { ProfileInfo } from './profile-finder'
import { autoPaginate } from './pagination'
import fs from 'fs'
import Spotify from './spotify'
import { TasteProfile, getMyTasteProfile } from './taste'

interface playlistSimilarity { 
  playlistId: string,
  playlistSimilarityScore: number,
}

export interface Similarity {
  playlistSimilarityScores: playlistSimilarity[],
  totalSimilarityScore: number,
  artistSimilarityScore: number,
}

function intersectionSize(x: any[], y: any[]) : number { 
  return x.filter(value => y.includes(value)).length
}

function similarityScore(x: any[], y: any[]) {
  return intersectionSize(x, y)
}

export function getArtistSimilarity(
  myTasteProfile: TasteProfile, 
  userProfile: ProfileInfo
) {
  return similarityScore(
    myTasteProfile.artistIds, 
    userProfile.followingArtists
  )
}

export async function getSimilarity(
  userTaste: TasteProfile, 
  userProfile: ProfileInfo
) {
  let similarity: Similarity = { 
    playlistSimilarityScores: [], 
    totalSimilarityScore: 0, 
    artistSimilarityScore: 0
  }

  const promises = userProfile.playlistIds.map(async (playlistId) => {
    const playlist = await autoPaginate<SpotifyApi.PlaylistTrackObject>(
      Spotify.getPlaylistTracks as any, playlistId)
    const playlistTrackIds = playlist.map(item => item.track.id) 
    const playlistTrackArtistIds = (playlist as any)
      .map(({ track }) => track.artists)
      .map(artists => artists.map(artist => artist.id))
      .flat()
    similarity.playlistSimilarityScores
      .push({
        playlistId,
        playlistSimilarityScore: 
          similarityScore(userTaste.trackIds, playlistTrackIds) + 
          similarityScore(userTaste.artistIds, playlistTrackArtistIds)
      })
  })
  await Promise.all(promises)

  similarity.artistSimilarityScore = getArtistSimilarity(userTaste, userProfile) 
  similarity.totalSimilarityScore = similarity.playlistSimilarityScores
    .reduce((x, y) => x + y.playlistSimilarityScore, 0) 

  return similarity
}

async function blah() {
  const userSavedInfo = await getMyTasteProfile()
  // fs.readFileSync('profile.json')
  console.log(await getSimilarity(userSavedInfo, JSON.parse(fs.readFileSync('profiles/profile6.json').toString())))
}

blah()
