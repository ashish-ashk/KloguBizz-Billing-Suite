import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  RequiredValidator,
  ɵNgNoValidate
} from "./chunk-I22U2CHU.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  AuthService,
  Router,
  RouterLink
} from "./chunk-AGABJEXX.js";
import {
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/auth/login.component.ts
function LoginComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 4);
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("src", (tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.logoUrl, \u0275\u0275sanitizeUrl);
  }
}
function LoginComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275text(1, "K");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.accentColor) || "#818cf8") + "," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.primaryColor) || "#4f46e5") + ")");
  }
}
function LoginComponent_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 18);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function LoginComponent_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 27);
    \u0275\u0275text(1, " Signing in\u2026 ");
  }
}
function LoginComponent_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Sign In ");
  }
}
var LoginComponent = class _LoginComponent {
  auth;
  api;
  router;
  email = "";
  password = "";
  error = signal("");
  loading = signal(false);
  showPassword = signal(false);
  branding = signal(null);
  constructor(auth, api, router) {
    this.auth = auth;
    this.api = api;
    this.router = router;
  }
  ngOnInit() {
    this.api.publicBranding().subscribe({ next: (b) => this.branding.set(b), error: () => {
    } });
  }
  submit() {
    if (!this.email || !this.password) {
      this.error.set("Enter your email and password.");
      return;
    }
    this.error.set("");
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (res) => this.router.navigateByUrl(res.user.role === "superadmin" ? "/super-admin" : "/dashboard"),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Invalid email or password.");
      }
    });
  }
  static \u0275fac = function LoginComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _LoginComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(Router));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginComponent, selectors: [["app-login"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 54, vars: 13, consts: [[1, "auth-page"], [1, "auth-panel", "page-enter"], [2, "max-width", "360px", "width", "100%", "margin", "0 auto"], [1, "brand", 2, "margin-bottom", "34px"], ["alt", "Logo", 2, "width", "36px", "height", "36px", "border-radius", "10px", "object-fit", "contain", "flex-shrink", "0", 3, "src"], [1, "brand-mark", 3, "background"], [1, "brand-name", 2, "color", "var(--text)"], [1, "brand-sub", 2, "color", "var(--muted)"], [2, "margin", "0 0 6px", "font-size", "24px", "letter-spacing", "-0.4px"], [2, "margin", "0 0 26px", "color", "var(--muted)", "font-size", "14px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["for", "email"], ["id", "email", "name", "email", "type", "email", "placeholder", "you@company.com", "autocomplete", "email", "required", "", 3, "ngModelChange", "ngModel"], ["for", "password"], [2, "position", "relative"], ["id", "password", "name", "password", "placeholder", "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", "autocomplete", "current-password", "required", "", 2, "padding-right", "64px", 3, "ngModelChange", "type", "ngModel"], ["type", "button", 2, "position", "absolute", "right", "8px", "top", "50%", "transform", "translateY(-50%)", "border", "0", "background", "transparent", "color", "var(--brand)", "font-size", "11px", "font-weight", "700", "cursor", "pointer", 3, "click"], [1, "info-box", "danger"], ["type", "submit", 1, "btn", "primary", "lg", "block", 3, "disabled"], [2, "margin-top", "22px", "color", "var(--muted)", "font-size", "13px", "text-align", "center"], ["routerLink", "/register", 2, "color", "var(--brand)", "font-weight", "600"], [1, "info-box", 2, "margin-top", "18px"], [1, "auth-art"], [1, "art-badges"], [1, "art-badge"], [1, "brand-mark"], [1, "spinner"]], template: function LoginComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "section", 1)(2, "div", 2)(3, "div", 3);
      \u0275\u0275template(4, LoginComponent_Conditional_4_Template, 1, 1, "img", 4)(5, LoginComponent_Conditional_5_Template, 2, 2, "div", 5);
      \u0275\u0275elementStart(6, "div")(7, "div", 6);
      \u0275\u0275text(8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 7);
      \u0275\u0275text(10);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(11, "h1", 8);
      \u0275\u0275text(12, "Welcome back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(13, "p", 9);
      \u0275\u0275text(14, "Sign in to manage your invoices and payments.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "form", 10);
      \u0275\u0275listener("ngSubmit", function LoginComponent_Template_form_ngSubmit_15_listener() {
        return ctx.submit();
      });
      \u0275\u0275elementStart(16, "div", 11)(17, "label", 12);
      \u0275\u0275text(18, "Email address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "input", 13);
      \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_19_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(20, "div", 11)(21, "label", 14);
      \u0275\u0275text(22, "Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "div", 15)(24, "input", 16);
      \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_24_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(25, "button", 17);
      \u0275\u0275listener("click", function LoginComponent_Template_button_click_25_listener() {
        return ctx.showPassword.set(!ctx.showPassword());
      });
      \u0275\u0275text(26);
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(27, LoginComponent_Conditional_27_Template, 2, 1, "div", 18);
      \u0275\u0275elementStart(28, "button", 19);
      \u0275\u0275template(29, LoginComponent_Conditional_29_Template, 2, 0)(30, LoginComponent_Conditional_30_Template, 1, 0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(31, "p", 20);
      \u0275\u0275text(32);
      \u0275\u0275elementStart(33, "a", 21);
      \u0275\u0275text(34, "Create an account");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(35, "div", 22)(36, "strong");
      \u0275\u0275text(37, "Demo logins");
      \u0275\u0275elementEnd();
      \u0275\u0275element(38, "br");
      \u0275\u0275text(39, " Tenant admin: admin@techsoft.local / Admin@123");
      \u0275\u0275element(40, "br");
      \u0275\u0275text(41, " Super admin: superadmin@klogubizz.local / SuperAdmin@123 ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(42, "section", 23)(43, "h2");
      \u0275\u0275text(44, "GST billing that runs itself.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "p");
      \u0275\u0275text(46, " Create GST-compliant invoices in seconds, track payments and reminders automatically, and keep your whole team on the same page \u2014 from one clean dashboard. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 24)(48, "span", 25);
      \u0275\u0275text(49, "\u2713 CGST \xB7 SGST \xB7 IGST automatic");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(50, "span", 25);
      \u0275\u0275text(51, "\u2713 Payment tracking");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "span", 25);
      \u0275\u0275text(53, "\u2713 Multi-user roles");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_1_0;
      let tmp_2_0;
      let tmp_10_0;
      let tmp_11_0;
      \u0275\u0275advance(4);
      \u0275\u0275conditional(((tmp_0_0 = ctx.branding()) == null ? null : tmp_0_0.logoUrl) ? 4 : 5);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(((tmp_1_0 = ctx.branding()) == null ? null : tmp_1_0.appName) || "Klogu Bizz");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.branding()) == null ? null : tmp_2_0.tagline) || "GST Billing Suite");
      \u0275\u0275advance(9);
      \u0275\u0275twoWayProperty("ngModel", ctx.email);
      \u0275\u0275advance(5);
      \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
      \u0275\u0275twoWayProperty("ngModel", ctx.password);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", ctx.showPassword() ? "HIDE" : "SHOW", " ");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.error() ? 27 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.loading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 29 : 30);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" New to ", ((tmp_10_0 = ctx.branding()) == null ? null : tmp_10_0.appName) || "Klogu Bizz", "? ");
      \u0275\u0275advance(10);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_11_0 = ctx.branding()) == null ? null : tmp_11_0.primaryColor) || "#1e1b4b") + " 0%," + (((tmp_11_0 = ctx.branding()) == null ? null : tmp_11_0.secondaryColor) || "#312e81") + " 55%," + (((tmp_11_0 = ctx.branding()) == null ? null : tmp_11_0.accentColor) || "#4f46e5") + " 100%)");
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, DefaultValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterLink], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "src\\app\\features\\auth\\login.component.ts", lineNumber: 81 });
})();
export {
  LoginComponent
};
//# sourceMappingURL=chunk-SLGLNADT.js.map
