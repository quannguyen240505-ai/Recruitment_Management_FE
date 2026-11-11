import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Login
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  // SCRUM-119: Candidate Registration
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then(m => m.Register)
  },

  // SCRUM-135: Change Password
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password')
        .then(m => m.ChangePassword)
  },

  // Dashboard
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard')
        .then(m => m.Dashboard)
  },

  // Recruiter: Create Job
  {
    path: 'recruiter/jobs/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jobs/create-job/create-job')
        .then(m => m.CreateJob)
  },

  // Public Job Details
  {
    path: 'recruiter/jobs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jobs/recruiter-jobs/recruiter-jobs')
        .then(m => m.RecruiterJobs)
  },
  {
    path: 'jobs/:jobId',
    loadComponent: () =>
      import('./features/jobs/job-detail/job-detail')
        .then(m => m.JobDetail)
  },

  // Default Route
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  // Fallback Route
  {
    path: '**',
    redirectTo: 'login'
  }
];
