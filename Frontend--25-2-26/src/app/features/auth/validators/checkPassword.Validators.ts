import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function checkPasswordValidation(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const password = control.value ?? '';
        // store all validation errors
        const errors: any = {}

        if (password.length < 5) {
            errors.minLength = true;
        }
        if (!/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.specialChar = true;
        }
        if (!/[A-Z]/.test(password)) {
            errors.uppercase = true;
        }

        if (!/[0-9]/.test(password)) {
            errors.number = true;
        }
        // this check if any errors exist
        return Object.keys(errors).length ? errors : null;
    }
}