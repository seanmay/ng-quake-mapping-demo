import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EventsService {
  public static CUSTOM_EVENTS = {
    // Output Events
    APP_ELEM_SETTINGS_CHANGED: 'APP_ELEM_SETTINGS_CHANGED',
  };
  constructor(@Inject(DOCUMENT) private document: Document) {}

  dispatchCustomEvent(name: string, detail?: any, delay: number = 0) {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    if (delay) {
      setTimeout(() => this.document.dispatchEvent(event), delay);
    } else {
      this.document.dispatchEvent(event);
    }
  }

  subscribeToEvent(name: string) {
    return fromEvent(this.document, name);
  }
}