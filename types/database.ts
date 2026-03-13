export type UserRole = 'admin' | 'pastor' | 'lider' | 'vice_lider' | 'voluntario'
export type UserStatus = 'pendente' | 'ativo' | 'inativo'
export type TeamSector = 'administrativo' | 'gestao_instagram' | 'trafego_pago' | 'projecao' | 'stories' | 'edicao_video'
export type TaskStatus = 'pendente' | 'andamento' | 'revisao' | 'concluido'
export type ContentType = 'post_story' | 'carrossel' | 'reels' | 'video_elaborado' | 'arte_grafica'

export interface Profile {
  id: string
  name: string
  email: string
  username?: string
  auth_user_id?: string
  role: UserRole
  status?: UserStatus
  team?: TeamSector
  available_days?: string[]
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

export interface KanbanBoard {
  id: string
  title: string
  team_target: TeamSector
  created_at: string
  updated_at: string
}

export interface KanbanList {
  id: string
  board_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
}

export interface Checklist {
  id: string
  task_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  content: string
  is_completed: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  content_type: ContentType
  status: TaskStatus
  team_target?: TeamSector
  board_id?: string
  list_id?: string
  gdrive_link?: string
  image_url?: string
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
  admin: 'Administrador',
  pastor: 'Pastor',
  lider: 'Líder',
  vice_lider: 'Vice-líder',
  voluntario: 'Voluntário',
}

export const TEAM_LABELS: Record<TeamSector, string> = {
  administrativo: 'Administrativo',
  gestao_instagram: 'Gestão de Instagram',
  trafego_pago: 'Tráfego Pago',
  projecao: 'Projeção',
  stories: 'Stories',
  edicao_video: 'Edição de Vídeo',
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
