import Spotify from './spotify'
import { autoPaginate } from './pagination'
import fs from 'fs'

export interface TasteProfile {
  trackIds?: string[],
  artistIds?: string[],
}

export async function getMyTasteProfile(): Promise<TasteProfile> {
  const mySavedTracks = await autoPaginate<SpotifyApi.SavedTrackObject>(Spotify.getMySavedTracks as any)
  return {
    trackIds: mySavedTracks.map(item => item.track.id),
    artistIds: mySavedTracks
      .map(item => item.track.artists.map(artist => artist.id))
      .flat()
  }
}