import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/service/authService/auth-service';
import { checkPasswordValidation } from '../../validators/checkPassword.Validators';
import { passwordMatchValidator } from '../../validators/passwordMatch.validators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-pages',
  imports: [ReactiveFormsModule],
  templateUrl: './register-pages.html',
  styleUrl: './register-pages.css',
})
export class RegisterPages {

  constructor(
    private RegisterDetail: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) { }          
  registerForm: any;

  ngOnInit() {
    this.registerForm = this.RegisterDetail.group(
      {
        name: new FormControl('', [Validators.required]),
        email: new FormControl('', [Validators.required, Validators.maxLength(50), Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')]),
        password: new FormControl('', [Validators.required, Validators.minLength(5), checkPasswordValidation()]),
        confirmPassword: new FormControl('', [Validators.required]),
        role: new FormControl('', [Validators.required])
      },
      {
        validators: passwordMatchValidator('password', 'confirmPassword')
      }
    );
  }

  // private auth = inject(AuthService);                                    // i can also inject like this
  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      alert('Invalid form');
      return;
    }
    const value = this.registerForm.value;
    this.auth.getRegisterDetails(value!.name, value!.email, value!.password, value!.role).subscribe({
      next: (_data: any) => {
        alert('User Registered');
        this.router.navigate(['/auth/login']);
      },
      error: (_err: any) => {
        alert('Register failed. Already created Account');
      }
    });
  }
}
