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
  private readonly pageSize = 5;
  private appliedUserSearch = '';
  private appliedBanSearch = '';

  protected searchTerm = '';
  protected banSearchTerm = '';
  protected usersLoading = true;
  protected bansLoading = true;
  protected usersError = '';
  protected bansError = '';
  protected users: any[] = [];
  protected systemBans: any[] = [];
  protected usersTotal = 0;
  protected bansTotal = 0;
  protected usersHaveMore = false;
  protected bansHaveMore = false;

  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();

    if (!currentUser) {
      this.usersLoading = false;
      this.bansLoading = false;
      this.usersError = 'You must be logged in to view users.';
      this.bansError = 'You must be logged in to view permanent system bans.';
      return;
    }

    this.loadUsers(true);
    this.loadSystemBans(true);
  }

  protected searchUsers(): void {
    this.appliedUserSearch = this.searchTerm.trim();
    this.loadUsers(true);
  }

  protected searchSystemBans(): void {
    this.appliedBanSearch = this.banSearchTerm.trim();
    this.loadSystemBans(true);
  }

  protected loadMoreUsers(): void {
    this.loadUsers(false);
  }

  protected loadMoreSystemBans(): void {
    this.loadSystemBans(false);
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

  private loadUsers(reset: boolean): void {
    if (reset) {
      this.users = [];
      this.usersTotal = 0;
      this.usersHaveMore = false;
    }

    this.usersError = '';
    this.usersLoading = true;

    this.adminService
      .getUsers(this.appliedUserSearch, this.users.length, this.pageSize)
      .subscribe({
        next: (response: any) => {
          this.usersLoading = false;

          if (!response.valid) {
            this.usersError = response.message || 'Unable to load users.';
            return;
          }

          this.users = reset ? response.users : [...this.users, ...response.users];
          this.usersTotal = response.total;
          this.usersHaveMore = response.hasMore;
        },
        error: (error) => {
          this.usersLoading = false;
          this.usersError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }

  private loadSystemBans(reset: boolean): void {
    if (reset) {
      this.systemBans = [];
      this.bansTotal = 0;
      this.bansHaveMore = false;
    }

    this.bansError = '';
    this.bansLoading = true;

    this.adminService
      .getSystemBans(this.appliedBanSearch, this.systemBans.length, this.pageSize)
      .subscribe({
        next: (response: any) => {
          this.bansLoading = false;

          if (!response.valid) {
            this.bansError = response.message || 'Unable to load permanent system bans.';
            return;
          }

          this.systemBans =
            reset ? response.systemBans : [...this.systemBans, ...response.systemBans];
          this.bansTotal = response.total;
          this.bansHaveMore = response.hasMore;
        },
        error: (error) => {
          this.bansLoading = false;
          this.bansError = error.error?.message || 'Unable to contact the server.';
        },
      });
  }
}
