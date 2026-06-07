import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity } from '../models/activity.model';


@Injectable({ providedIn: 'root' })
export class ActivityService {

  private apiUrl = 'http://localhost:8222/api/activities';

  constructor(private http: HttpClient) {}

  getActivitiesByEvent(eventId: number): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.apiUrl}/event/${eventId}`);
  }

  createActivity(activity: Activity): Observable<Activity> {
    return this.http.post<Activity>(this.apiUrl, activity);
  }

  updateActivity(id: number, activity: Activity): Observable<Activity> {
    return this.http.put<Activity>(`${this.apiUrl}/${id}`, activity);
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}