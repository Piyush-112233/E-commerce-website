import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordMatchValidator(password: string, confirmPassword: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {

    const pass = formGroup.get(password);
    const confirm = formGroup.get(confirmPassword);
    // console.log(pass?.value)
    // console.log(confirm?.value)

    if (!pass || !confirm) return null;
    
    if (pass.value !== confirm.value) {
      return { passwordMisMatch: true };
    }

    return null;
  };
}