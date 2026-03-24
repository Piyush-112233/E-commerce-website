import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/service/authService/auth-service';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule,RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  constructor(
    private forgotDetails: FormBuilder,
    private auth: AuthService,
  ) { }

  email: string = "";
  forgotForm: any;

  ngOnInit() {
    this.forgotForm = this.forgotDetails.group(
      {
        email: ['', [Validators.required, Validators.email]]
      }
    )
  }

  sentResetLink() {
    const value = this.forgotForm.value;
    this.auth.getForgotPassword(value?.email).subscribe(
      {
        next: (_data: any) => {
          alert("Reset link sent to your email")
        },
        error: (_data: any) => {
          console.log(_data)
          alert(_data.error.message);
        }
      }
    )
  }
}
