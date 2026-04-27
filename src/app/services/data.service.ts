import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'backend/api.php'; // Ajustar según despliegue, para dev puede ser http://localhost/api.php

  constructor(private http: HttpClient) { }

  validateCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}?action=validate`, { email, code });
  }

  getTelefonia(): Observable<any> {
    return this.http.get(`${this.apiUrl}?action=getTelefonia`);
  }

  processRecharge(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}?action=recharge`, data);
  }
}
