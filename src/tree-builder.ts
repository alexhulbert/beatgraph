
import Spotify, { accessToken } from './main'
import { autoPaginate, retryWrapper } from './pagination'
import Axios from 'axios'

const LIMIT = 5

interface BasicProfileInfo {
  id: string
  followerCount: number
  followingCount: number
}

export interface ProfileInfo extends BasicProfileInfo {
  followers: BasicProfileInfo[]
  followingProfiles: BasicProfileInfo[]
  followingArtists: string[]
  playlistIds: string[]
  playlistFollowers: number
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

async function processNode(root: Tree<ProfileInfo>, depthRemaining = 3) {
  console.log(`GETTING USER PLAYLISTS FOR ${root.id}`)
  const userPlaylists = await autoPaginate<SpotifyApi.PlaylistObjectSimplified>(Spotify.getUserPlaylists as any, root.id)
  root.playlistIds = userPlaylists.map(p => p.id)
  root.playlistFollowers = userPlaylists.reduce((acc, next) => acc + next.tracks.total, 0)
  if (depthRemaining) {
    console.log(`GETTING USER FOLLOWING FOR ${root.id}`)
    const userFollowing = await retryWrapper(getUserFollowing, root.id)
    console.log(`GETTING USER FOLLOWERS FOR ${root.id}`)
    const userFollowers = await retryWrapper(getUserFollowers, root.id)

    if (!userFollowers || !userFollowing) {
      console.log(`COULDN'T GET FOLLOW GRAPH FOR USER ${root.id}`)
      return root
    }

    const mapToBasicInfo = (p: any) => ({
      id: p.uri.slice(13),
      followerCount: p.followers_count,
      followingCount: p.following_count
    })

    root.followers = userFollowers.map(mapToBasicInfo)
    root.children = userFollowing
      .filter((p: any) => p.uri.startsWith('spotify:user'))
      .map(mapToBasicInfo)
    root.followingArtists = userFollowing
      .filter((p: any) => p.uri.startsWith('spotify:artist'))
      .map((p: any) => p.uri.slice(15))

    root.children = root.children.filter(c => !c.id.includes('%')).sort((a, b) => {
      if (b.followingCount < 200 || a.followingCount < 200) {
        return b.followingCount - a.followingCount
      } else {
        return b.followerCount - a.followerCount
      }
    }).slice(0, LIMIT)
  }

  if (depthRemaining > 1) {
    /*for (const child of root.children) {
      await processNode(child, depthRemaining - 1)
    }*/

    const promises = root.children.map(child => processNode(child, depthRemaining - 1))
    await Promise.all(promises)
  }

  return root
}

module.exports = processNode

;(async function() {
  const fs = require('fs')
  const output = await processNode({ id: 'constantinex' } as any)
  output.children.forEach(console.log)
})()
