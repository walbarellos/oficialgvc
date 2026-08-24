export enum VisitorCategory {
  GENERAL = 'general',
  STUDENT = 'student',
  RESEARCHER = 'researcher'
}

export enum Gender {
  MALE = 'masculino',
  FEMALE = 'feminino'
}

export interface Visitor {
  id: string;
  fullName: string;
  cpf?: string;
  passport?: string;
  isForeigner: boolean;
  gender: Gender;
  email?: string;
  phone?: string;
  category: VisitorCategory;
  photoUrl?: string;
  createdAt: string;
  birthDate?: string;
  address?: string;
}

export enum LockerStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance'
}

export interface Locker {
  id: string;
  number: number;
  status: LockerStatus;
  visitorId?: string;
  assignedAt?: string;
}

export enum VisitStatus {
  ACTIVE = 'Ativo',
  COMPLETED = 'Concluído',
  OVERSTAYED = 'Excedido'
}

export interface Visit {
  id: string;
  visitorId: string;
  checkInTime: string;
  checkOutTime?: string;
  location: string;
  status: VisitStatus;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export type UserRole = 'administrador' | 'coordenador' | 'funcionario' | 'monitor' | 'cidadao';

export interface SystemUser {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  espacoId: string;
  espacoNome: string;
  ativo: boolean;
}

export interface SpaceConfig {
  id: string;
  nome: string;
  municipio: string;
  totalArmarios: number;
  mensagemBoasVindas: string;
  tempoLimiteExcedido: number;
  capacidadeVisitantes: number;
  horarioFuncionamento: string;
  perfilArmarios: boolean;
  perfilTelecentro: boolean;
  perfilAgendamento: boolean;
  totalComputadores: number;
  tempoLimiteComputador: number;
  capacidadeAgendamento: number;
}
