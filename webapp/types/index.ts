export type Patient = {
  id: string;
  name: string;
  roomId: string;
  faceEmbedding: number[];
  faceEmbeddingModel?: string;
  medicines: string[];
};

export type Medicine = {
  id: string;
  name: string;
  description: string;
  dose_description: string;
  prescribed_by: string;
  scheduleIds: string[];
};

export type ScheduleStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type Schedule = {
  id: string;
  patientId: string;
  medicineId: string;
  time: string;
  roomId: string;
  status: ScheduleStatus;
};

export type Room = {
  id: string;
  name: string;
  polygonCoordinates: { x: number; y: number }[];
};

export type MapData = {
  occupancyGrid: number[][];
  rooms: Room[];
};

export enum RobotState {
  IDLE = 'IDLE',
  MAPPING = 'MAPPING',
  MAP_READY = 'MAP_READY',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  NAVIGATING = 'NAVIGATING',
  ARRIVED = 'ARRIVED',
  VERIFYING_FACE = 'VERIFYING_FACE',
  DELIVERING = 'DELIVERING',
  WAITING_FOR_FACE = 'WAITING_FOR_FACE',
  RETURNING = 'RETURNING',
  ERROR = 'ERROR',
}

export type RobotPosition = {
  x: number;
  y: number;
  heading: number;
};

export type RobotTelemetry = {
  position: RobotPosition;
  battery: number;
  currentState: RobotState;
  currentRoom: string | null;
};

export type UserRole = 'admin' | 'caregiver' | 'viewer';

export type User = {
  id: string;
  email: string;
  role: UserRole;
};

export type ScheduleUpdate = Partial<
  Pick<Schedule, 'patientId' | 'medicineId' | 'time' | 'roomId' | 'status'>
>;

export type ManualDriveCommand = {
  type: 'MANUAL_DRIVE';
  linear: number;
  angular: number;
};

export type DispatchCommand = {
  type: 'DISPATCH';
  patientId: string;
  medicineId: string;
  roomId: string;
};

export type EmergencyStopCommand = { type: 'EMERGENCY_STOP' };

export type ExtendStandbyCommand = {
  type: 'EXTEND_STANDBY';
  durationSeconds: number;
};

export type AbortReturnCommand = { type: 'ABORT_RETURN' };

export type StartMappingCommand = { type: 'START_MAPPING' };

export type EnrollFaceCommand = {
  type: 'ENROLL_FACE';
  patientId: string;
  imageBase64: string; // base64-encoded JPEG, no data: prefix
};

export type FaceEnrolledMessage = {
  type: 'FACE_ENROLLED';
  patientId: string;
  embedding: number[];
  model?: string;
};

export type PingCommand = { type: 'PING'; ts: number };

export type RobotCommand =
  | DispatchCommand
  | ManualDriveCommand
  | EmergencyStopCommand
  | ExtendStandbyCommand
  | AbortReturnCommand
  | StartMappingCommand
  | EnrollFaceCommand
  | PingCommand;

export type WebSocketConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';
