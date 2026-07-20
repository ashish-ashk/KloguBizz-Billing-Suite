import {
  AuthPreviewCardComponent
} from "./chunk-77MUVYJA.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  RequiredValidator,
  ɵNgNoValidate
} from "./chunk-XAFCZYPI.js";
import {
  AuthService,
  Router,
  RouterLink
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵattribute,
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
} from "./chunk-6VNHH65J.js";

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
    \u0275\u0275elementStart(0, "div", 39);
    \u0275\u0275text(1, "K");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.accentColor) || "#818cf8") + "," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.primaryColor) || "#4f46e5") + ")");
  }
}
function LoginComponent_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function LoginComponent_Conditional_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 40);
    \u0275\u0275text(1, " Signing in\u2026 ");
  }
}
function LoginComponent_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Sign In ");
    \u0275\u0275element(1, "app-icon", 25);
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 15);
  }
}
function LoginComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 30)(1, "strong");
    \u0275\u0275text(2, "Demo logins");
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "br");
    \u0275\u0275text(4, " Tenant admin: admin@techsoft.local / Admin@123");
    \u0275\u0275element(5, "br");
    \u0275\u0275text(6, " Super admin: superadmin@klogubizz.local / SuperAdmin@123 ");
    \u0275\u0275elementEnd();
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
  showDemo = signal(false);
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginComponent, selectors: [["app-login"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 72, vars: 27, consts: [[1, "auth-page"], [1, "auth-panel", "page-enter"], [2, "max-width", "360px", "width", "100%", "margin", "0 auto"], [1, "brand", 2, "margin-bottom", "30px"], ["alt", "Logo", 2, "width", "36px", "height", "36px", "border-radius", "10px", "object-fit", "contain", "flex-shrink", "0", 3, "src"], [1, "brand-mark", 3, "background"], [1, "brand-name", 2, "color", "var(--text)"], [1, "brand-sub", 2, "color", "var(--muted)"], [1, "auth-eyebrow"], ["name", "lock", 3, "size"], [2, "margin", "0 0 6px", "font-size", "25px", "letter-spacing", "-0.4px"], [2, "margin", "0 0 26px", "color", "var(--muted)", "font-size", "14px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["for", "email"], [1, "auth-field"], ["name", "mail", 1, "field-icon", 3, "size"], ["id", "email", "name", "email", "type", "email", "placeholder", "you@company.com", "autocomplete", "email", "required", "", 3, "ngModelChange", "ngModel"], ["for", "password"], ["name", "lock", 1, "field-icon", 3, "size"], ["id", "password", "name", "password", "placeholder", "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", "autocomplete", "current-password", "required", "", 2, "padding-right", "36px", 3, "ngModelChange", "type", "ngModel"], ["type", "button", 1, "link-btn", 3, "click"], [3, "name", "size"], [1, "info-box", "danger"], ["type", "submit", 1, "btn", "primary", "lg", "block", 3, "disabled"], ["name", "chevronRight", 3, "size"], [2, "margin-top", "20px", "color", "var(--muted)", "font-size", "13px", "text-align", "center"], ["routerLink", "/register", 2, "color", "var(--brand)", "font-weight", "600"], [2, "margin-top", "18px", "text-align", "center"], ["type", "button", 1, "link-btn", 2, "font-size", "12px", "color", "var(--muted)", 3, "click"], [1, "info-box", 2, "margin-top", "10px", "font-size", "11.5px"], [1, "auth-art"], [3, "accentColor"], [1, "art-badges"], [1, "art-badge"], ["name", "check", 3, "size"], [1, "auth-trust"], ["name", "shield", 3, "size"], ["name", "checkCircle", 3, "size"], [1, "brand-mark"], [1, "spinner"]], template: function LoginComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "section", 1)(2, "div", 2)(3, "div", 3);
      \u0275\u0275template(4, LoginComponent_Conditional_4_Template, 1, 1, "img", 4)(5, LoginComponent_Conditional_5_Template, 2, 2, "div", 5);
      \u0275\u0275elementStart(6, "div")(7, "div", 6);
      \u0275\u0275text(8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 7);
      \u0275\u0275text(10);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(11, "div", 8);
      \u0275\u0275element(12, "app-icon", 9);
      \u0275\u0275text(13, " Secure Sign In");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "h1", 10);
      \u0275\u0275text(15, "Welcome back");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "p", 11);
      \u0275\u0275text(17, "Sign in to manage your invoices and payments.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "form", 12);
      \u0275\u0275listener("ngSubmit", function LoginComponent_Template_form_ngSubmit_18_listener() {
        return ctx.submit();
      });
      \u0275\u0275elementStart(19, "div", 13)(20, "label", 14);
      \u0275\u0275text(21, "Email address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "div", 15);
      \u0275\u0275element(23, "app-icon", 16);
      \u0275\u0275elementStart(24, "input", 17);
      \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_24_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(25, "div", 13)(26, "label", 18);
      \u0275\u0275text(27, "Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(28, "div", 15);
      \u0275\u0275element(29, "app-icon", 19);
      \u0275\u0275elementStart(30, "input", 20);
      \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_30_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "button", 21);
      \u0275\u0275listener("click", function LoginComponent_Template_button_click_31_listener() {
        return ctx.showPassword.set(!ctx.showPassword());
      });
      \u0275\u0275element(32, "app-icon", 22);
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(33, LoginComponent_Conditional_33_Template, 2, 1, "div", 23);
      \u0275\u0275elementStart(34, "button", 24);
      \u0275\u0275template(35, LoginComponent_Conditional_35_Template, 2, 0)(36, LoginComponent_Conditional_36_Template, 2, 1, "app-icon", 25);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(37, "p", 26);
      \u0275\u0275text(38);
      \u0275\u0275elementStart(39, "a", 27);
      \u0275\u0275text(40, "Create an account");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(41, "div", 28)(42, "button", 29);
      \u0275\u0275listener("click", function LoginComponent_Template_button_click_42_listener() {
        return ctx.showDemo.set(!ctx.showDemo());
      });
      \u0275\u0275text(43);
      \u0275\u0275elementEnd()();
      \u0275\u0275template(44, LoginComponent_Conditional_44_Template, 7, 0, "div", 30);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(45, "section", 31);
      \u0275\u0275element(46, "app-auth-preview-card", 32);
      \u0275\u0275elementStart(47, "div")(48, "h2");
      \u0275\u0275text(49, "Billing software, your team will actually trust.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(50, "p");
      \u0275\u0275text(51, " Every invoice computes CGST, SGST and IGST server-side from state codes \u2014 no manual tax math, no spreadsheet drift. Payments, reminders and your whole team stay on one ledger. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "div", 33)(53, "span", 34);
      \u0275\u0275element(54, "app-icon", 35);
      \u0275\u0275text(55, " CGST \xB7 SGST \xB7 IGST automatic");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(56, "span", 34);
      \u0275\u0275element(57, "app-icon", 35);
      \u0275\u0275text(58, " Payment tracking");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "span", 34);
      \u0275\u0275element(60, "app-icon", 35);
      \u0275\u0275text(61, " Multi-user roles");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(62, "div", 36)(63, "span");
      \u0275\u0275element(64, "app-icon", 37);
      \u0275\u0275text(65, " Isolated data per organisation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(66, "span");
      \u0275\u0275element(67, "app-icon", 9);
      \u0275\u0275text(68, " Encrypted credentials");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "span");
      \u0275\u0275element(70, "app-icon", 38);
      \u0275\u0275text(71, " Built for Indian GST");
      \u0275\u0275elementEnd()()()()();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_1_0;
      let tmp_2_0;
      let tmp_15_0;
      let tmp_18_0;
      let tmp_19_0;
      \u0275\u0275advance(4);
      \u0275\u0275conditional(((tmp_0_0 = ctx.branding()) == null ? null : tmp_0_0.logoUrl) ? 4 : 5);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(((tmp_1_0 = ctx.branding()) == null ? null : tmp_1_0.appName) || "Klogu Bizz");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.branding()) == null ? null : tmp_2_0.tagline) || "GST Billing Suite");
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 11);
      \u0275\u0275advance(11);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance();
      \u0275\u0275twoWayProperty("ngModel", ctx.email);
      \u0275\u0275advance(5);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance();
      \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
      \u0275\u0275twoWayProperty("ngModel", ctx.password);
      \u0275\u0275advance();
      \u0275\u0275attribute("aria-label", ctx.showPassword() ? "Hide password" : "Show password");
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.showPassword() ? "eyeOff" : "eye")("size", 15);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.error() ? 33 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.loading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 35 : 36);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" New to ", ((tmp_15_0 = ctx.branding()) == null ? null : tmp_15_0.appName) || "Klogu Bizz", "? ");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", ctx.showDemo() ? "Hide demo credentials" : "View demo credentials", " ");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showDemo() ? 44 : -1);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_18_0 = ctx.branding()) == null ? null : tmp_18_0.primaryColor) || "#1e1b4b") + " 0%," + (((tmp_18_0 = ctx.branding()) == null ? null : tmp_18_0.secondaryColor) || "#312e81") + " 55%," + (((tmp_18_0 = ctx.branding()) == null ? null : tmp_18_0.accentColor) || "#4f46e5") + " 100%)");
      \u0275\u0275advance();
      \u0275\u0275property("accentColor", ((tmp_19_0 = ctx.branding()) == null ? null : tmp_19_0.accentColor) || "#818cf8");
      \u0275\u0275advance(8);
      \u0275\u0275property("size", 12);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 12);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 12);
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 13);
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, DefaultValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterLink, IconComponent, AuthPreviewCardComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "src\\app\\features\\auth\\login.component.ts", lineNumber: 104 });
})();
export {
  LoginComponent
};
//# sourceMappingURL=chunk-2CLBE56K.js.map
