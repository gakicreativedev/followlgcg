export type UserRole = 'pastor' | 'lider' | 'vice_lider' | 'voluntario'
export type TaskStatus = 'pendente' | 'andamento' | 'revisao' | 'concluido'
export type ContentType = 'post_story' | 'carrossel' | 'reels' | 'video_elaborado' | 'arte_grafica'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Availability {
  id: string
  user_id: string
  days: string[]
  max_weekly_deliveries: number
  tools: string[]
  created_at: string
  updated_at: string
}

export interface UserCapability {
  id: string
  user_id: string
  content_type: ContentType
}

export interface Task {
  id: string
  title: string
  description?: string
  content_type: ContentType
  status: TaskStatus
  assigned_to?: string
  created_by?: string
  due_date?: string
  priority: number
  notes?: string
  created_at: string
  updated_at: string
  assignee?: Profile
  creator?: Profile
}

export interface TaskHistory {
  id: string
  task_id: string
  changed_by?: string
  old_status?: TaskStatus
  new_status?: TaskStatus
  note?: string
  created_at: string
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post_story: 'Post / Story',
  carrossel: 'Carrossel',
  reels: 'Reels',
  video_elaborado: 'Vídeo elaborado',
  arte_grafica: 'Arte gráfica',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  andamento: 'Em andamento',
  revisao: 'Em revisão',
  concluido: 'Concluído',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  pastor: 'Pastor',
  lider: 'Líder',
  vice_lider: 'Vice-líder',
  voluntario: 'Voluntário',
}

export const DAYS_LABELS: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}
