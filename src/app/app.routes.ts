import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'recruiter/jobs/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/jobs/create-job/create-job').then(m => m.CreateJob)
  },
  {
    path: 'jobs/:jobId',
    loadComponent: () => import('./features/jobs/job-detail/job-detail').then(m => m.JobDetail)
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
