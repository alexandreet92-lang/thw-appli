// ══════════════════════════════════════════════════════════════════
// WebBluetoothSource — implémentation navigator.bluetooth (Chrome/Edge desktop,
// Chrome Android). LECTURE SEULE : on s'abonne aux notifications, jamais
// d'écriture de contrôle (pas d'ERG/résistance). Cible livrable de ce lot.
// ══════════════════════════════════════════════════════════════════
import type { SensorSource, SensorSample, SensorDevice, SensorKind } from './types'
import {
  parseHeartRate, parseCyclingPower, parseIndoorBikeData, parseCsc,
  crankCadence, type CrankState,
} from './parsers'

interface BleChar { startNotifications: () => Promise<BleChar>; addEventListener: (t: string, cb: (e: Event) => void) => void }
interface BleService { getCharacteristic: (c: number) => Promise<BleChar> }
interface BleServer { getPrimaryService: (s: number) => Promise<BleService> }
interface BleDevice { id?: string; name?: string; gatt?: { connect: () => Promise<BleServer>; disconnect: () => void }; addEventListener: (t: string, cb: () => void) => void }

const HR_SVC = 0x180d, HR_CHAR = 0x2a37
const CP_SVC = 0x1818, CP_CHAR = 0x2a63
const FTMS_SVC = 0x1826, FTMS_CHAR = 0x2ad2
const CSC_SVC = 0x1816, CSC_CHAR = 0x2a5b

const valueOf = (e: Event): DataView => (e.target as unknown as { value: DataView }).value

export class WebBluetoothSource implements SensorSource {
  private subs = new Set<(s: SensorSample) => void>()
  private cranks = new Map<string, CrankState>()

  isAvailable(): Promise<boolean> {
    return Promise.resolve(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  }

  subscribe(cb: (s: SensorSample) => void): () => void {
    this.subs.add(cb)
    return () => { this.subs.delete(cb) }
  }

  private emit(partial: Omit<SensorSample, 'ts'>): void {
    const s: SensorSample = { ...partial, ts: Date.now() }
    for (const cb of this.subs) cb(s)
  }

  /** Cadence depuis les données de manivelle, avec mémoire du relevé précédent. */
  private cadenceFromCrank(id: string, crank: CrankState | undefined): number | undefined {
    if (!crank) return undefined
    const prev = this.cranks.get(id)
    this.cranks.set(id, crank)
    if (!prev) return undefined
    return crankCadence(prev, crank) ?? undefined
  }

  async connect(kind: SensorKind): Promise<SensorDevice> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bt = (navigator as any).bluetooth
    const primary = kind === 'hr' ? HR_SVC : kind === 'cadence' ? CSC_SVC : FTMS_SVC
    const device: BleDevice = await bt.requestDevice({
      filters: [{ services: [primary] }, { services: [CP_SVC] }],
      optionalServices: [HR_SVC, CP_SVC, FTMS_SVC, CSC_SVC],
    })
    const id = device.id ?? device.name ?? 'ble'
    const server = await device.gatt!.connect()

    if (kind === 'hr') {
      await this.notify(server, HR_SVC, HR_CHAR, e => {
        const bpm = parseHeartRate(valueOf(e))
        if (bpm != null && bpm >= 20 && bpm <= 240) this.emit({ heartRate: bpm })
      })
    } else if (kind === 'cadence') {
      await this.notify(server, CSC_SVC, CSC_CHAR, e => {
        const cad = this.cadenceFromCrank(id, parseCsc(valueOf(e)).crank)
        if (cad != null) this.emit({ cadence: cad })
      })
    } else {
      await this.connectTrainer(server, id)
    }

    const close = () => { try { device.gatt?.disconnect() } catch { /* ignore */ } this.cranks.delete(id) }
    return { id, kind, name: device.name ?? 'Capteur', close }
  }

  /** Trainer : FTMS (Indoor Bike Data) en priorité, repli sur Cycling Power. */
  private async connectTrainer(server: BleServer, id: string): Promise<void> {
    try {
      await this.notify(server, FTMS_SVC, FTMS_CHAR, e => {
        const r = parseIndoorBikeData(valueOf(e))
        const out: Omit<SensorSample, 'ts'> = {}
        if (r.power != null && r.power >= 0 && r.power <= 3000) out.power = r.power
        if (r.cadence != null && r.cadence >= 0 && r.cadence <= 250) out.cadence = Math.round(r.cadence)
        if (out.power != null || out.cadence != null) this.emit(out)
      })
      return
    } catch { /* pas de FTMS → Cycling Power */ }
    await this.notify(server, CP_SVC, CP_CHAR, e => {
      const r = parseCyclingPower(valueOf(e))
      const out: Omit<SensorSample, 'ts'> = {}
      if (r.power >= 0 && r.power <= 3000) out.power = r.power
      const cad = this.cadenceFromCrank(id, r.crank)
      if (cad != null) out.cadence = cad
      if (out.power != null || out.cadence != null) this.emit(out)
    })
  }

  private async notify(server: BleServer, svc: number, char: number, cb: (e: Event) => void): Promise<void> {
    const service = await server.getPrimaryService(svc)
    const ch = await service.getCharacteristic(char)
    await ch.startNotifications()
    ch.addEventListener('characteristicvaluechanged', cb)
  }

  async disconnect(d: SensorDevice): Promise<void> { d.close() }
}
