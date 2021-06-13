import Spotify from './main'
import { autoPaginate } from './pagination'
import fs from 'fs'

export interface SavedTracksArtistIDs {
  trackIDs?: string[],
  artistIDs?: string[],
}

export async function getMySavedTracksArtistIDs(): Promise<SavedTracksArtistIDs> {
  const mySavedTracks = await autoPaginate<SpotifyApi.SavedTrackObject>(Spotify.getMySavedTracks as any)
  console.log('!!!!', mySavedTracks.length)
  return {
    trackIDs: mySavedTracks.map(item => item.track.id),
    artistIDs: mySavedTracks
      .map(item => item.track.artists.map(artist => artist.id))
      .flat()
  }
}