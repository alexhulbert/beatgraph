
import Spotify, { accessToken } from './spotify'
import { autoPaginate, retryWrapper } from './pagination'
import Axios from 'axios'
import { TasteProfile, getMyTasteProfile } from './taste'
import { getArtistSimilarity, getSimilarity, Similarity } from './similarity'

const LIMIT = 5
const LOWER_BOUND = 0 // 10000
const UPPER_BOUND = 100000

interface BasicProfileInfo {
  id: string
  followerCount: number
  followingCount: number
}

export interface ProfileInfo extends BasicProfileInfo {
  followingProfiles: BasicProfileInfo[]
  followingArtists: string[]
  playlistIds: string[]
  playlistFollowers: number
}

export interface DetailedProfileInfo extends ProfileInfo {
  similarityData: Similarity
}

export interface RawProfileInfo {
  uri: string
  followers_count: number
  following_count: number
}

type Tree<T> = T & { children: Tree<T>[] }

function getUserFollowers(userId: string) {
  return getUserProfileInfo(userId, 'followers')
}

function getUserFollowing(userId: string) {
  return getUserProfileInfo(userId, 'following')
}

async function getUserProfileInfo(userId: string, action: string) {
  const path = `/user-profile-view/v3/profile/${userId}/${action}`
  const resp = await Axios.get(path, {
    params: { market: 'from_token' },
    headers: { authorization: 'Bearer ' + accessToken },
    baseURL: 'https://spclient.wg.spotify.com'
  })
  return resp.data.profiles
}

function filterOnlyProfiles(followers: RawProfileInfo[]): BasicProfileInfo[] {
  return followers
    .filter(p => p.uri.startsWith('spotify:user'))
    .map(p => ({
      id: p.uri.slice(13),
      followerCount: p.followers_count,
      followingCount: p.following_count
    }))
}

function filterOnlyArtists(followers: RawProfileInfo[]): string[] {
  return followers  
    .filter(p => p.uri.startsWith('spotify:artist'))
    .map(p => p.uri.slice(15))
}

export async function findTopFollowers(
  myTasteProfile: TasteProfile,
  rootId: string
): Promise<DetailedProfileInfo[]> {
  // const userFollowers = await retryWrapper(getUserFollowers, rootId)
  const followingUsers: BasicProfileInfo[] = filterOnlyProfiles(
    await retryWrapper(getUserFollowing, rootId)
  )
  
  const prunedFollowingUsers = followingUsers
    .filter(({ id }) => !id.includes('%')) // TODO: Fix this?
    .filter(({ followerCount }) =>
      followerCount > LOWER_BOUND && followerCount < UPPER_BOUND
    )
    .sort(_ => 0.5 - Math.random())

  const followingUsersWithStats: ProfileInfo[] = await Promise.all(
    prunedFollowingUsers.map(async followingUser => {
      type POS = SpotifyApi.PlaylistObjectSimplified
      const playlists = await autoPaginate<POS>(Spotify.getUserPlaylists as any, followingUser.id)
      const allFollowing = await retryWrapper(getUserFollowing, followingUser.id)
      let followingArtists = [], followingProfiles = []
      if (!allFollowing) {
        console.warn('COULDNT CALL FOLLOWING API FOR USER ' + followingUser.id)
      } else {
        followingArtists = filterOnlyArtists(allFollowing)
        followingProfiles = filterOnlyProfiles(allFollowing)
      }
      const playlistIds = playlists.map(p => p.id)
      const playlistFollowers = playlists.reduce((acc, next) => acc + next.tracks.total, 0)
      console.log('!!!')
      return {
        ...followingUser,
        playlistIds,
        playlistFollowers,
        followingArtists,
        followingProfiles
      }
    })
  )

  console.log('GOT HERE')
  const topUsers = followingUsersWithStats
    .sort((a, b) => {
      const artistSimilarityA = getArtistSimilarity(myTasteProfile, a)
      const artistSimilarityB = getArtistSimilarity(myTasteProfile, b)
      return (
        (artistSimilarityB - artistSimilarityA) ||
        (b.playlistFollowers - a.playlistFollowers)
      )
    })
    .slice(0, LIMIT)

   return await Promise.all(
    topUsers.map(async topUser => {
      const similarityData = await getSimilarity(myTasteProfile, topUser)
      return { ...topUser, similarityData }
    })
   )
}

(async function() {
  const tasteProfile = await getMyTasteProfile()
  const results = await findTopFollowers(tasteProfile, 'joekayxsoulection')
  console.log(results)
})()
