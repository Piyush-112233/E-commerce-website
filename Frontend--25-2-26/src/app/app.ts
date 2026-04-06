import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from './core/service/authService/auth-service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Frontend--25-2-26');

  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.auth.loadMe().pipe(take(1)).subscribe((me) => {
      console.log('Me', me);

      // If the user is already authenticated and lands on auth pages (e.g. after Google OAuth redirect),
      // send them to the correct area.
      if (!me) return;
      if (!this.router.url.startsWith('/auth')) return;

      const targetUrl = me.role === 'admin' ? '/admin' : '/';
      if (this.router.url !== targetUrl) {
        this.router.navigateByUrl(targetUrl);
      }
    });
  }
}