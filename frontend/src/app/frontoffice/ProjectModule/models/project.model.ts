import { Task } from './task.model';
import { FreelancerSkill } from './freelancer-skill.model';
import { Category, ProjectStatus } from './enums.model';

export interface Project {
  id?: number;

  title: string;
  description: string;
  budget: number;

  startDate: string;     // LocalDate -> string en Angular
  endDate: string;

  status: ProjectStatus;
  category: Category;

  createdAt?: string;

  client?: {
    id: number;
    name: string;
    lastName?: string;
    email?: string;
  };

  tasks?: Task[];
  requiredSkills?: FreelancerSkill[];
}
