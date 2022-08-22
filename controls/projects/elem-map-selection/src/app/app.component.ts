import { Component } from '@angular/core';
import { EventsService } from './event.service';

@Component({
  template: `
    <div>
      <select (change)="onSelectedMap($event)">
        <option *ngFor="let map of mapsList">{{map}}</option>
      </select>
    </div>
  `
})
export class AppComponent {
  mapsList = [
    'E1M1.MAP',
    'E1M2.MAP',
    'E1M3.MAP',
    'E1M4.MAP',
    'E1M5.MAP',
    'E1M6.MAP',
    'E1M7.MAP',
    'E1M8.MAP',
  ];

  constructor(private eventsService: EventsService) {}
  onSelectedMap($event: any) {
    console.log($event.target.value);
    this.eventsService.dispatchCustomEvent(EventsService.CUSTOM_EVENTS.APP_ELEM_MAP_SELECTED, { selectedMap: $event.target.value})
  }
}
