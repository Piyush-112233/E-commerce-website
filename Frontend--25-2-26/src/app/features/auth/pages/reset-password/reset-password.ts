import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/service/authService/auth-service.js';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { checkPasswordValidation } from '../../validators/checkPassword.Validators.js';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule,RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  constructor(
    private resetDetails: FormBuilder,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }
  token: string = "";
  resetForm: any;


  ngOnInit() {
    // Inside group({ }) you must only define form controls, not assignments like this.token = ....
    this.token = this.route.snapshot.params["token"];

    this.resetForm = this.resetDetails.group(
      {
        password:  ['', [Validators.required, Validators.minLength(5), checkPasswordValidation()]],
        confirmPassword:  ['', [Validators.required, Validators.minLength(5), checkPasswordValidation()]]
      }
    )
  }

  resetPassword() {
    const value = this.resetForm.value
    this.auth.getResetPassword(this.token, value?.password).subscribe(
      {
        next: (_data: any) => {
          alert("Password reset successful")
          this.router.navigate(['/'])
        },
        error: (_data:any) => {
          console.log(_data.error.message)
          alert(_data.error.message);
        }
      }
    )
  }
}
