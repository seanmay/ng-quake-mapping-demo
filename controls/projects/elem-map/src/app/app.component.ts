import { Component } from '@angular/core';
import { EventsService } from './event.service';

@Component({
  template: `
    <div>
      <h4>{{title}}</h4>
    </div>
  `,
  styles: []
})
export class AppComponent {
  title = '';

  constructor(private eventService: EventsService) {
    this.eventService.subscribeToEvent(EventsService.CUSTOM_EVENTS.APP_ELEM_MAP_SELECTED).subscribe((d: any) => {
      this.title = 'Selected Map: ' + d.detail.selectedMap || '';
    });
  }
}
