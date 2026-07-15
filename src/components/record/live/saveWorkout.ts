// Persistance d'une séance muscu — même chemin que l'app existante
// (table workout_sessions). Photos uploadées best-effort dans workout-photos.
import { createClient } from '@/lib/supabase/client'
import type { WorkoutExercise } from '@/types/workout'
import type { SessionFormData } from '../SessionSaveForm'

interface SaveArgs {
  sport: 'gym'
  startedAt: string
  durationSec: number
  exercises: WorkoutExercise[]
  setsCompleted: number
  volumeKg: number
  hr: { avg: number | null; max: number | null; min: number | null }
  form: SessionFormData
}

export async function saveWorkout(a: SaveArgs): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const sessionId = crypto.randomUUID()
  const photoUrls: string[] = []
  for (let i = 0; i < (a.form.photos ?? []).length; i++) {
    const f = a.form.photos![i]
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${sessionId}/${i}.${ext}`
    const { error } = await supabase.storage.from('workout-photos').upload(path, f, { upsert: true })
    if (!error) photoUrls.push(supabase.storage.from('workout-photos').getPublicUrl(path).data.publicUrl)
  }
  await supabase.from('workout_sessions').insert({
    id: sessionId, user_id: user.id, sport: a.sport, status: 'done',
    started_at: a.startedAt, ended_at: new Date().toISOString(),
    duration_seconds: a.durationSec,
    title: a.form.title, training_types: a.form.trainingTypes, rpe: a.form.rpe, comment: a.form.comment,
    calories: Math.round(a.durationSec / 60 * 7),
    exercises_detail: a.exercises, total_volume_kg: a.volumeKg, sets_completed: a.setsCompleted,
    avg_hr: a.hr.avg, max_hr: a.hr.max, min_hr: a.hr.min,
    photos: photoUrls.length ? photoUrls : null,
  })
}
