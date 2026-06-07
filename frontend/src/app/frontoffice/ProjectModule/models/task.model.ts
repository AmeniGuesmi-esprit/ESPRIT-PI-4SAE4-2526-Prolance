import { Priority } from "./enums.model";

export interface Task {
  id?: number;

  taskName: string;
  description: string;

  startDate: string;
  endDate: string;

  priority: Priority;
  milestone: string;

  project?: {
    id: number;
  };
}
