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
  showTelephonyModal = false;
  showMultiRewardModal = false;
  showSuccessSection = false;

  telefoniaOptions: any[] = [];
  availableRewards: any[] = [];
  selectedReward: any = null;
  validationData: any = null;
  pdfUrl: string = '';

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
    if (!this.model.privacy) {
      Swal.fire('Aviso', 'Debes aceptar el aviso de privacidad', 'warning');
      return;
    }

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
          this.handleResponse(res);
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Error', 'Hubo un problema al validar el código.', 'error');
      }
    });
  }

  handleResponse(res: any) {
    this.validationData = res;
    
    switch (res.status) {
      case 'ALREADY_REDEEMED':
        this.pdfUrl = res.pdfUrl;
        this.showSuccessSection = true;
        Swal.fire('Atención', res.message, 'info');
        break;

      case 'MULTI_REWARD':
        this.availableRewards = res.rewards;
        this.showMultiRewardModal = true;
        break;

      case 'REQUIRE_TELEPHONY':
        this.showTelephonyModal = true;
        break;

      case 'SUCCESS':
        this.pdfUrl = res.pdfUrl;
        this.showSuccessSection = true;
        Swal.fire('¡Felicidades!', res.message, 'success');
        break;
    }
  }

  confirmRewardSelection() {
    if (!this.selectedReward) return;
    
    this.loadingModal = true;
    const data = {
      email: this.model.email,
      code: this.model.code,
      idRecompensa: this.selectedReward.idRecompensa
    };

    this.dataService.selectReward(data).subscribe({
      next: (res) => {
        this.loadingModal = false;
        this.showMultiRewardModal = false;
        this.handleResponse(res);
      },
      error: (err) => {
        this.loadingModal = false;
        Swal.fire('Error', 'No se pudo procesar la selección.', 'error');
      }
    });
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
        this.showTelephonyModal = false;
        if (res.success) {
          this.pdfUrl = res.pdfUrl; // Si el recharge devuelve PDF
          this.showSuccessSection = true;
          Swal.fire('Éxito', res.message, 'success');
        } else {
          Swal.fire('Error', res.message, 'error');
        }
      },
      error: (err) => {
        this.loadingModal = false;
        Swal.fire('Error', 'Hubo un problema al procesar la recarga.', 'error');
      }
    });
  }

  downloadPdf() {
    if (this.pdfUrl) {
      window.open(this.pdfUrl, '_blank');
    }
  }

  isTelephonyValid() {
    return this.telephonyModel.idTelefonia && 
           this.telephonyModel.phone && 
           this.telephonyModel.phone.length === 10 &&
           this.telephonyModel.phone === this.telephonyModel.confirmPhone;
  }
}
