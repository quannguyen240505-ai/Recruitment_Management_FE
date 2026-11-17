import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // SCRUM-154: Chỉ hiển thị menu Recruiter
  // cho tài khoản có Role RECRUITER
  get isRecruiter(): boolean {
    return this.auth.hasAccessToken() &&
      this.auth.getCurrentRole() === 'RECRUITER';
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
