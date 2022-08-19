import { Component } from '@angular/core';

@Component({
  template: `
    <div style="background-color: #2a2a2a;">
      <h4>{{title}}</h4>
    </div>
  `,
  styles: []
})
export class AppComponent {
  title = 'elem-map-selection';
}
