import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';
import Swal from 'sweetalert2';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-registration',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    InputTextModule, 
    ButtonModule, 
    DropdownModule, 
    ProgressSpinnerModule,
    CheckboxModule
  ],
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {
  model = {
    email: '',
    code: '',
    privacy: false
  };
  
  telephonyModel = {
    phone: '',
    confirmPhone: '',
    idTelefonia: null
  };
  
  loading = false;
  validating = false;
  tokenValidated = false;
  showSuccessSection = false;
  loadingTelefonia = false;
  validationData: any = null;
  telefoniaOptions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    console.log('Componente Kre-ta inicializado');
    this.route.queryParams.subscribe(params => {
      const token = params['token'] || params['t'];
      if (token) {
        this.model.code = token;
        this.validateTokenAutomatically();
      }
    });
    this.loadTelefonia();
  }

  loadTelefonia() {
    this.loadingTelefonia = true;
    this.dataService.getTelefonia().subscribe({
      next: (res) => {
        this.loadingTelefonia = false;
        this.telefoniaOptions = res;
      },
      error: (err) => {
        this.loadingTelefonia = false;
        console.error('Error cargando telefonía', err);
      }
    });
  }

  validateTokenAutomatically() {
    this.validating = true;
    this.dataService.validateCode('', this.model.code).subscribe({
      next: (res) => {
        this.validating = false;
        if (res.success) {
          this.tokenValidated = true;
          this.validationData = res || {};
        } else {
          this.tokenValidated = false;
          Swal.fire({
            title: 'Atención',
            text: res.error || 'Token inválido',
            icon: 'warning',
            confirmButtonColor: '#ED342E',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then(() => window.location.reload());
        }
      },
      error: (err) => {
        this.validating = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo conectar con el servidor',
          icon: 'error',
          confirmButtonColor: '#ED342E',
          allowOutsideClick: false
        }).then(() => window.location.reload());
      }
    });
  }

  isTelephonyValid() {
    return this.telephonyModel.phone && 
           this.telephonyModel.phone.length === 10 && 
           this.telephonyModel.phone === this.telephonyModel.confirmPhone && 
           this.telephonyModel.idTelefonia;
  }

  onSubmit() {
    if (!this.isTelephonyValid()) {
      Swal.fire('Atención', 'Por favor completa todos los campos correctamente', 'info');
      return;
    }

    this.loading = true;
    const payload = {
      phone: this.telephonyModel.phone,
      idTelefonia: this.telephonyModel.idTelefonia,
      idRegistro: this.validationData.idRegistro,
      idProyecto: this.validationData.idProyecto,
      idRecompensa: this.validationData.idRecompensa,
      code: this.model.code
    };

    this.dataService.processRecharge(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.showSuccessSection = true;
          Swal.fire({
            title: '¡Éxito!',
            text: 'Tu recarga ha sido procesada correctamente.',
            icon: 'success',
            confirmButtonColor: '#ED342E',
            allowOutsideClick: false
          }).then(() => window.location.reload());
        } else {
          this.tokenValidated = false;
          Swal.fire({
            title: 'Atención',
            text: res.error || 'Error al procesar la recarga',
            icon: 'warning',
            confirmButtonColor: '#ED342E',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then(() => window.location.reload());
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          title: 'Error',
          text: 'Error de conexión',
          icon: 'error',
          confirmButtonColor: '#ED342E',
          allowOutsideClick: false
        }).then(() => window.location.reload());
      }
    });
  }
}
