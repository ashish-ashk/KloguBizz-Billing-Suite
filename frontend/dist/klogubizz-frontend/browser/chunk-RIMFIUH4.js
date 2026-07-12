import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-I22U2CHU.js";
import {
  STATES,
  isValidEmail
} from "./chunk-ECR3SCST.js";
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
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/auth/register.component.ts
var _forTrack0 = ($index, $item) => $item.code;
function RegisterComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 4);
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("src", (tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.logoUrl, \u0275\u0275sanitizeUrl);
  }
}
function RegisterComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32);
    \u0275\u0275text(1, "K");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.accentColor) || "#818cf8") + "," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.primaryColor) || "#4f46e5") + ")");
  }
}
function RegisterComponent_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275text(1, "Password must be at least 8 characters.");
    \u0275\u0275elementEnd();
  }
}
function RegisterComponent_For_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 23);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r2 = ctx.$implicit;
    \u0275\u0275property("value", s_r2.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r2.name, " (", s_r2.code, ")");
  }
}
function RegisterComponent_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function RegisterComponent_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 33);
    \u0275\u0275text(1, " Creating account\u2026 ");
  }
}
function RegisterComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Create Account ");
  }
}
var RegisterComponent = class _RegisterComponent {
  auth;
  api;
  router;
  name = "";
  orgName = "";
  email = "";
  password = "";
  stateCode = "27";
  states = STATES;
  error = signal("");
  loading = signal(false);
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
    if (!this.name.trim() || !this.orgName.trim()) {
      this.error.set("Enter your name and company name.");
      return;
    }
    if (!isValidEmail(this.email)) {
      this.error.set("Enter a valid email address.");
      return;
    }
    if (this.password.length < 8) {
      this.error.set("Password must be at least 8 characters.");
      return;
    }
    this.error.set("");
    this.loading.set(true);
    this.auth.register({
      name: this.name.trim(),
      orgName: this.orgName.trim(),
      email: this.email.trim(),
      password: this.password,
      stateCode: this.stateCode
    }).subscribe({
      next: () => this.router.navigateByUrl("/dashboard"),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || "Registration failed. Please try again.");
      }
    });
  }
  static \u0275fac = function RegisterComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RegisterComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(Router));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RegisterComponent, selectors: [["app-register"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 61, vars: 14, consts: [[1, "auth-page"], [1, "auth-panel", "page-enter"], [2, "max-width", "380px", "width", "100%", "margin", "0 auto"], [1, "brand", 2, "margin-bottom", "28px"], ["alt", "Logo", 2, "width", "36px", "height", "36px", "border-radius", "10px", "object-fit", "contain", "flex-shrink", "0", 3, "src"], [1, "brand-mark", 3, "background"], [1, "brand-name", 2, "color", "var(--text)"], [1, "brand-sub", 2, "color", "var(--muted)"], [2, "margin", "0 0 6px", "font-size", "24px", "letter-spacing", "-0.4px"], [2, "margin", "0 0 24px", "color", "var(--muted)", "font-size", "14px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["for", "name"], ["id", "name", "name", "name", "placeholder", "Priya Sharma", "required", "", 3, "ngModelChange", "ngModel"], ["for", "orgName"], ["id", "orgName", "name", "orgName", "placeholder", "Acme Traders Pvt Ltd", "required", "", 3, "ngModelChange", "ngModel"], ["for", "email"], ["id", "email", "name", "email", "type", "email", "placeholder", "you@company.com", "required", "", 3, "ngModelChange", "ngModel"], ["for", "password"], ["id", "password", "name", "password", "type", "password", "placeholder", "At least 8 characters", "required", "", 3, "ngModelChange", "ngModel"], [1, "error"], ["for", "state"], ["id", "state", "name", "stateCode", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "hint"], [1, "info-box", "danger"], ["type", "submit", 1, "btn", "primary", "lg", "block", 3, "disabled"], [2, "margin-top", "20px", "color", "var(--muted)", "font-size", "13px", "text-align", "center"], ["routerLink", "/login", 2, "color", "var(--brand)", "font-weight", "600"], [1, "auth-art"], [1, "art-badges"], [1, "art-badge"], [1, "brand-mark"], [1, "spinner"]], template: function RegisterComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "section", 1)(2, "div", 2)(3, "div", 3);
      \u0275\u0275template(4, RegisterComponent_Conditional_4_Template, 1, 1, "img", 4)(5, RegisterComponent_Conditional_5_Template, 2, 2, "div", 5);
      \u0275\u0275elementStart(6, "div")(7, "div", 6);
      \u0275\u0275text(8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 7);
      \u0275\u0275text(10);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(11, "h1", 8);
      \u0275\u0275text(12, "Create your organisation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(13, "p", 9);
      \u0275\u0275text(14, "14-day free trial \xB7 No credit card required");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "form", 10);
      \u0275\u0275listener("ngSubmit", function RegisterComponent_Template_form_ngSubmit_15_listener() {
        return ctx.submit();
      });
      \u0275\u0275elementStart(16, "div", 11)(17, "label", 12);
      \u0275\u0275text(18, "Your full name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "input", 13);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_19_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.name, $event) || (ctx.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(20, "div", 11)(21, "label", 14);
      \u0275\u0275text(22, "Company name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "input", 15);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_23_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.orgName, $event) || (ctx.orgName = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(24, "div", 11)(25, "label", 16);
      \u0275\u0275text(26, "Work email");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "input", 17);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_27_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(28, "div", 11)(29, "label", 18);
      \u0275\u0275text(30, "Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "input", 19);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_31_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(32, RegisterComponent_Conditional_32_Template, 2, 0, "span", 20);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "div", 11)(34, "label", 21);
      \u0275\u0275text(35, "State (for GST)");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "select", 22);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_select_ngModelChange_36_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.stateCode, $event) || (ctx.stateCode = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(37, RegisterComponent_For_38_Template, 2, 3, "option", 23, _forTrack0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "span", 24);
      \u0275\u0275text(40, "Used to decide CGST/SGST vs IGST on your invoices.");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(41, RegisterComponent_Conditional_41_Template, 2, 1, "div", 25);
      \u0275\u0275elementStart(42, "button", 26);
      \u0275\u0275template(43, RegisterComponent_Conditional_43_Template, 2, 0)(44, RegisterComponent_Conditional_44_Template, 1, 0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(45, "p", 27);
      \u0275\u0275text(46, " Already have an account? ");
      \u0275\u0275elementStart(47, "a", 28);
      \u0275\u0275text(48, "Sign in");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(49, "section", 29)(50, "h2");
      \u0275\u0275text(51, "Launch-ready from day one.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(52, "p");
      \u0275\u0275text(53, " Your organisation gets its own isolated workspace \u2014 clients, invoices, payments and team roles \u2014 with GST math handled server-side, every time. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "div", 30)(55, "span", 31);
      \u0275\u0275text(56, "\u2713 Tenant isolation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(57, "span", 31);
      \u0275\u0275text(58, "\u2713 Invoice numbering");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "span", 31);
      \u0275\u0275text(60, "\u2713 Free trial");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_1_0;
      let tmp_2_0;
      let tmp_13_0;
      \u0275\u0275advance(4);
      \u0275\u0275conditional(((tmp_0_0 = ctx.branding()) == null ? null : tmp_0_0.logoUrl) ? 4 : 5);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(((tmp_1_0 = ctx.branding()) == null ? null : tmp_1_0.appName) || "Klogu Bizz");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.branding()) == null ? null : tmp_2_0.tagline) || "GST Billing Suite");
      \u0275\u0275advance(9);
      \u0275\u0275twoWayProperty("ngModel", ctx.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.orgName);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.email);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.password);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.password && ctx.password.length < 8 ? 32 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.stateCode);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.error() ? 41 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.loading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 43 : 44);
      \u0275\u0275advance(6);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_13_0 = ctx.branding()) == null ? null : tmp_13_0.primaryColor) || "#1e1b4b") + " 0%," + (((tmp_13_0 = ctx.branding()) == null ? null : tmp_13_0.secondaryColor) || "#312e81") + " 55%," + (((tmp_13_0 = ctx.branding()) == null ? null : tmp_13_0.accentColor) || "#4f46e5") + " 100%)");
    }
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterLink], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RegisterComponent, { className: "RegisterComponent", filePath: "src\\app\\features\\auth\\register.component.ts", lineNumber: 89 });
})();
export {
  RegisterComponent
};
//# sourceMappingURL=chunk-RIMFIUH4.js.map
