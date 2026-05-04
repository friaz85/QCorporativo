import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'backend/admin_api.php';
  private currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('adminUser') || 'null'));
  public currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}?action=login`, credentials).pipe(
      tap(user => {
        if (user && user.token) {
          localStorage.setItem('adminUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('adminUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/admin/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }
}
