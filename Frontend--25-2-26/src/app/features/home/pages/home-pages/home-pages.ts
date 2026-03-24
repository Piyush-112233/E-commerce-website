import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home-pages',
  imports: [],
  templateUrl: './home-pages.html',
  styleUrl: './home-pages.css',
})
export class HomePages {

  // constructor(
  //   private route: ActivatedRoute,
  //   private router: Router
  // ) { }

  // ngOnInit() {
  //   this.route.queryParams.subscribe(params => {
  //     console.log("------1")
  //     const token = params['accessToken'];
  //     console.log("Token from URL:", params);

  //     if (token) {
  //       // localStorage.setItem("token", token)

  //       // remove token from URL
  //       this.router.navigate([], {
  //         queryParams: {},
  //         replaceUrl: true
  //       });

  //       // // reload so navbar updates
  //       // window.location.reload();
  //       console.log("Token Saved", token);
  //     }
  //   })
  // }
}
