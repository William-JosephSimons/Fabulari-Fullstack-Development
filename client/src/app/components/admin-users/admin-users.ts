import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Admin } from '../../services/admin/admin';
import { Auth } from '../../services/auth/auth';
import { SuperAdminNavigation } from '../super-admin-navigation/super-admin-navigation';

@Component({
  selector: 'app-admin-users',
  imports: [SuperAdminNavigation, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers implements OnInit {
  private readonly adminService = inject(Admin);
  private readonly auth = inject(Auth);

  protected searchTerm = '';
  protected usersLoading = true;
  protected bansLoading = true;
  protected usersError = '';
  protected bansError = '';
  protected users: any[] = [];
  protected systemBans: any[] = [];

  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.usersLoading = false;
      this.bansLoading = false;
      this.usersError = 'You must be logged in to view users.';
      this.bansError = 'You must be logged in to view permanent system bans.';
      return;
    }

    this.loadUsers();
    this.loadSystemBans();
  }

  protected get filteredUsers() {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.users;
    }

    return this.users.filter((user) =>
      `${user.username} ${user.email} ${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(search)
    );
  }

  protected formatSystemRole(systemRole: string): string {
    return systemRole === 'superAdmin' ? 'Super Admin' : 'User';
  }

  protected formatDate(bannedAt: string): string {
    return new Date(bannedAt).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (response: any) => {
        this.usersLoading = false;

        if (!response.valid) {
          this.usersError = response.message || 'Unable to load users.';
          return;
        }

        this.users = response.users;
      },
      error: (error) => {
        this.usersLoading = false;
        this.usersError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }

  private loadSystemBans(): void {
    this.adminService.getSystemBans().subscribe({
      next: (response: any) => {
        this.bansLoading = false;

        if (!response.valid) {
          this.bansError = response.message || 'Unable to load permanent system bans.';
          return;
        }

        this.systemBans = response.systemBans;
      },
      error: (error) => {
        this.bansLoading = false;
        this.bansError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
