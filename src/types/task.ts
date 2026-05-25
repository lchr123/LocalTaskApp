export type TaskType = 'delivery' | 'shopping' | 'dog_walking' | 'queuing' | 'pickup';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  posterId: string;
  posterNickname: string;
  posterRating: number;
  type: TaskType;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  reward: number;
  deadline: string;
  status: TaskStatus;
  intentCount: number;
  selectedHelperId?: string;
  createdAt: string;
  distance?: number;
}

export interface Intent {
  id: string;
  taskId: string;
  helperId: string;
  helperNickname: string;
  helperRating: number;
  helperCompletedCount: number;
  message?: string;
  status: 'pending' | 'selected' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface CreateTaskPayload {
  type: TaskType;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  reward: number;
  deadline: string;
}

export interface TaskFilter {
  type?: TaskType;
  minReward?: number;
  maxReward?: number;
  radius?: number;
}
