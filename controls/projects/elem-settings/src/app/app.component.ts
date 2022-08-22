import { Component, ViewEncapsulation } from '@angular/core';
import { EventsService } from './events.service';

@Component({
  template: `
    <div>
      <table>
      <tr>
        <td>Brightness: {{brightnessValue}}</td>
        <td>
          <input type="range" min="0.2" max="1" (change)="chgBrightness($event)" [value]="brightnessValue" step="0.1" id="brightnessSlider">
        </td>
      </tr>
      <tr>
        <td>Sensitivity: {{senstivityValue}}</td>
        <td>
          <input type="range" min="0.5" max="2" (change)="chgSenstivity($event)" [value]="senstivityValue" step="0.1" id="senstivitySlider">
        </td>
      </tr>
      <tr>
        <td>Field View: {{fieldValue}}</td>
        <td>
        <input type="range" min="70" max="120" (change)="chgFieldView($event)" [value]="fieldValue" step="1" id="fieldViewSlider">
        </td>
      </tr>
      <tr>
        <td>Full Screen</td>
        <td>
          <button (click)="changeFS()">{{isFullScreen ? 'Yes' : 'No'}}</button>
        </td>
      </tr>
      </table>
    </div>
  `,
  encapsulation: ViewEncapsulation.ShadowDom
})
export class AppComponent {
  isFullScreen = false;
  brightnessValue = 0.8;
  fieldValue = 100;
  senstivityValue = 1;

  constructor(private eventService: EventsService) {}
  dispatchCustomEvent() {
    this.eventService.dispatchCustomEvent(EventsService.CUSTOM_EVENTS.APP_ELEM_SETTINGS_CHANGED, {
      isFullScreen:this.isFullScreen,
      brightnessValue: this.brightnessValue,
      fieldValue: this.fieldValue,
      senstivityValue: this.senstivityValue
    });
  }

  changeFS() {
    this.isFullScreen = !this.isFullScreen;
    setTimeout(this.dispatchCustomEvent.bind(this), 250);
  }

  chgBrightness($event: any) {
    this.brightnessValue = $event.target.value;
    setTimeout(this.dispatchCustomEvent.bind(this), 250);
  }

  chgSenstivity($event: any) {
    this.senstivityValue = $event.target.value;
    setTimeout(this.dispatchCustomEvent.bind(this), 250);
  }

  chgFieldView($event: any) {
    this.fieldValue = $event.target.value;
    setTimeout(this.dispatchCustomEvent.bind(this), 250);
  }
}
