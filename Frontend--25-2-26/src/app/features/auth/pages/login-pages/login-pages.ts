import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { checkPasswordValidation } from '../../validators/checkPassword.Validators';
import { AuthService } from '../../../../core/service/authService/auth-service';
import { CartService } from '../../../../core/service/cartService/cart-service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-pages',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-pages.html',
  styleUrl: './login-pages.css',
})
export class LoginPages {
  constructor(
    private LoginDetails: FormBuilder,
    private auth: AuthService,
    private cartService: CartService,
    private router: Router
  ) { }

  loginForm: any

  ngOnInit() {
    this.loginForm = this.LoginDetails.group(
      {
        email: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
        password: ['', [Validators.required, Validators.minLength(5), checkPasswordValidation()]]
      }
    )
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const value = this.loginForm.value;
    this.auth.getLoginDetails(value?.email, value?.password).subscribe({
      next: (res: any) => {
        alert("Login Successfully");
        // Store accessToken for Socket.IO fallback auth (backend also uses cookies).
        const token = res?.data?.accessToken ?? res?.accessToken;
        if (token) localStorage.setItem('accessToken', token);

        // Sync any guest cart items to the database, then clear local storage
        this.cartService.syncAndClearLocal().subscribe({
          next: () => console.log('Local cart synced to DB after login'),
          error: (err: any) => console.warn('Cart sync failed:', err)
        });

        this.auth.refreshMe().subscribe({
          next: (me) => {
            if (me?.role === 'admin') this.router.navigateByUrl('/admin');
            else this.router.navigateByUrl('/');
            console.log('Me', me);
          },
          error: () => this.router.navigateByUrl('/auth/login')
        });
        console.log("------")
      },
      error: (_error: any) => {
        // console.log("Login error full:",_error.data)
        alert("Login failed")
      }

    })

  }
  loginWithGoogle() {
    window.location.href = "http://localhost:3000/auth/google", "_self"
    console.log(window.open("http://localhost:3000/auth/google", "_self"))
  }

}
