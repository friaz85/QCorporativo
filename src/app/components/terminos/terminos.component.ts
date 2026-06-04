import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './terminos.component.html',
  styleUrls: ['./terminos.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class TerminosComponent {
  openPdf(brand: string) {
    let url = '';
    if (brand === 'suavel') {
      url = 'https://qrewards.com.mx/suavelkfc/';
    } else if (brand === 'kleenex') {
      url = 'https://qrewards.com.mx/kleenexkfc';
    }
    if (url) {
      window.open(url, '_blank');
    }
  }
}
