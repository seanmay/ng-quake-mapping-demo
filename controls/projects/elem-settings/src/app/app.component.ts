import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  template: `
    <div style="background-color: #cdcdcd;">
      <h4>{{title}}</h4>
    </div>
  `,
  styles: [],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class AppComponent {
  title = 'elem-settings';
}
