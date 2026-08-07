import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client'

// Cible d'un appel : un canal (salon `comm-<channelId>`) ou un espace entier.
export type CallTarget = { channelId: string } | { spaceId: string }
export const targetKey = (t: CallTarget) => ('channelId' in t ? `c:${t.channelId}` : `s:${t.spaceId}`)

export type VideoTrackT = LocalVideoTrack | RemoteVideoTrack

export interface Tile {
  key: string
  identity: string
  name: string
  isLocal: boolean
  speaking: boolean
  micOn: boolean
  variant: 'camera' | 'screen'
  video: VideoTrackT | null
}
