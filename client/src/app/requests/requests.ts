import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MainNavigation } from '../main-navigation/main-navigation';

@Component({
  selector: 'app-requests',
  imports: [MainNavigation, FormsModule],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests {
  protected selectedPersonalRequestId = 3;

  // These records demonstrate pending and rejected history before HTTP is connected.
  protected readonly personalRequests = [
    {
      id: 1,
      group: 'Book Club',
      type: 'Room proposal',
      request: 'Events room',
      submitted: '2 Aug 2026',
      status: 'Pending',
      reason: ''
    },
    {
      id: 2,
      group: 'Music Makers',
      type: 'Membership',
      request: 'Join group',
      submitted: '2 Aug 2026',
      status: 'Pending',
      reason: ''
    },
    {
      id: 3,
      group: 'Writers Hub',
      type: 'Membership',
      request: 'Join group',
      submitted: '28 Jul 2026',
      status: 'Rejected',
      reason: 'The request did not meet the group requirements.'
    }
  ];

  protected get selectedPersonalRequest() {
    return this.personalRequests.find((request) => request.id === this.selectedPersonalRequestId);
  }
}
