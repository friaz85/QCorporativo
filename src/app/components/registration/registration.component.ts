import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { DataService } from '../../services/data.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    InputTextModule, 
    ButtonModule, 
    CheckboxModule, 
    DialogModule, 
    DropdownModule
  ],
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerFade', [
      transition(':enter', [
        query('.form-group, .mt-4', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class RegistrationComponent implements OnInit {
  model = {
    email: '',
    code: '',
    privacy: false,
    captcha: false
  };

  telephonyModel = {
    idTelefonia: null,
    phone: '',
    confirmPhone: ''
  };

  loading = false;
  loadingModal = false;
  showModal = false;
  telefoniaOptions: any[] = [];
  validationData: any = null;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadTelefonia();
  }

  loadTelefonia() {
    this.dataService.getTelefonia().subscribe({
      next: (data) => this.telefoniaOptions = data,
      error: (err) => console.error('Error loading telefonia', err)
    });
  }

  onSubmit() {
    this.loading = true;
    this.dataService.validateCode(this.model.email, this.model.code).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.error) {
          Swal.fire({
            title: 'Error',
            text: res.error,
            icon: 'error',
            confirmButtonColor: '#e31b23'
          });
        } else {
          this.validationData = res;
          if (res.requiresTelephony) {
            this.showModal = true;
          } else {
            Swal.fire({
              title: '¡Éxito!',
              text: 'Tu código ha sido validado correctamente.',
              icon: 'success',
              confirmButtonColor: '#e31b23'
            });
          }
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al validar el código.',
          icon: 'error',
          confirmButtonColor: '#e31b23'
        });
      }
    });
  }

  isTelephonyValid() {
    return this.telephonyModel.idTelefonia && 
           this.telephonyModel.phone && 
           this.telephonyModel.phone.length === 10 &&
           this.telephonyModel.phone === this.telephonyModel.confirmPhone;
  }

  confirmTelephony() {
    this.loadingModal = true;
    const data = {
      ...this.telephonyModel,
      email: this.model.email,
      code: this.model.code,
      idProyecto: this.validationData.idProyecto,
      idRecompensa: this.validationData.idRecompensa
    };

    this.dataService.processRecharge(data).subscribe({
      next: (res) => {
        this.loadingModal = false;
        this.showModal = false;
        if (res.success) {
          Swal.fire({
            title: 'Confirmación',
            text: res.message || 'La recarga se ha procesado exitosamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#e31b23'
          });
        } else {
          Swal.fire({
            title: 'Error en la recarga',
            text: res.message || 'No se pudo procesar la recarga.',
            icon: 'error',
            confirmButtonColor: '#e31b23'
          });
        }
      },
      error: (err) => {
        this.loadingModal = false;
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al procesar la recarga.',
          icon: 'error',
          confirmButtonColor: '#e31b23'
        });
      }
    });
  }
}
