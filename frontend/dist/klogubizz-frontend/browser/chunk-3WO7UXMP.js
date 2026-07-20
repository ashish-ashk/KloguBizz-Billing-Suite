import {
  AuthPreviewCardComponent
} from "./chunk-77MUVYJA.js";
import {
  STATES,
  isValidEmail
} from "./chunk-7F65RAZH.js";
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
  NgSelectOption,
  RequiredValidator,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
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
} from "./chunk-6VNHH65J.js";

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
    \u0275\u0275elementStart(0, "div", 45);
    \u0275\u0275text(1, "K");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.accentColor) || "#818cf8") + "," + (((tmp_1_0 = ctx_r0.branding()) == null ? null : tmp_1_0.primaryColor) || "#4f46e5") + ")");
  }
}
function RegisterComponent_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 27);
    \u0275\u0275text(1, "Password must be at least 8 characters.");
    \u0275\u0275elementEnd();
  }
}
function RegisterComponent_For_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 30);
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
function RegisterComponent_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function RegisterComponent_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 46);
    \u0275\u0275text(1, " Creating account\u2026 ");
  }
}
function RegisterComponent_Conditional_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " Create Account ");
    \u0275\u0275element(1, "app-icon", 34);
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 15);
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RegisterComponent, selectors: [["app-register"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 85, vars: 28, consts: [[1, "auth-page"], [1, "auth-panel", "page-enter"], [2, "max-width", "380px", "width", "100%", "margin", "0 auto"], [1, "brand", 2, "margin-bottom", "24px"], ["alt", "Logo", 2, "width", "36px", "height", "36px", "border-radius", "10px", "object-fit", "contain", "flex-shrink", "0", 3, "src"], [1, "brand-mark", 3, "background"], [1, "brand-name", 2, "color", "var(--text)"], [1, "brand-sub", 2, "color", "var(--muted)"], [1, "auth-eyebrow"], ["name", "checkCircle", 3, "size"], [2, "margin", "0 0 6px", "font-size", "25px", "letter-spacing", "-0.4px"], [2, "margin", "0 0 24px", "color", "var(--muted)", "font-size", "14px"], [1, "form", 3, "ngSubmit"], [1, "field"], ["for", "name"], ["id", "name", "name", "name", "placeholder", "Priya Sharma", "required", "", 3, "ngModelChange", "ngModel"], ["for", "orgName"], ["id", "orgName", "name", "orgName", "placeholder", "Acme Traders Pvt Ltd", "required", "", 3, "ngModelChange", "ngModel"], ["for", "email"], [1, "auth-field"], ["name", "mail", 1, "field-icon", 3, "size"], ["id", "email", "name", "email", "type", "email", "placeholder", "you@company.com", "required", "", 3, "ngModelChange", "ngModel"], ["for", "password"], ["name", "lock", 1, "field-icon", 3, "size"], ["id", "password", "name", "password", "placeholder", "At least 8 characters", "required", "", 2, "padding-right", "36px", 3, "ngModelChange", "type", "ngModel"], ["type", "button", 1, "link-btn", 3, "click"], [3, "name", "size"], [1, "error"], ["for", "state"], ["id", "state", "name", "stateCode", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "hint"], [1, "info-box", "danger"], ["type", "submit", 1, "btn", "primary", "lg", "block", 3, "disabled"], ["name", "chevronRight", 3, "size"], [2, "margin-top", "20px", "color", "var(--muted)", "font-size", "13px", "text-align", "center"], ["routerLink", "/login", 2, "color", "var(--brand)", "font-weight", "600"], [1, "auth-art"], [3, "accentColor"], [1, "art-badges"], [1, "art-badge"], ["name", "check", 3, "size"], [1, "auth-trust"], ["name", "shield", 3, "size"], ["name", "lock", 3, "size"], [1, "brand-mark"], [1, "spinner"]], template: function RegisterComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "section", 1)(2, "div", 2)(3, "div", 3);
      \u0275\u0275template(4, RegisterComponent_Conditional_4_Template, 1, 1, "img", 4)(5, RegisterComponent_Conditional_5_Template, 2, 2, "div", 5);
      \u0275\u0275elementStart(6, "div")(7, "div", 6);
      \u0275\u0275text(8);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "div", 7);
      \u0275\u0275text(10);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(11, "div", 8);
      \u0275\u0275element(12, "app-icon", 9);
      \u0275\u0275text(13, " 14-Day Free Trial");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "h1", 10);
      \u0275\u0275text(15, "Create your organisation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "p", 11);
      \u0275\u0275text(17, "No credit card required \xB7 Cancel anytime");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "form", 12);
      \u0275\u0275listener("ngSubmit", function RegisterComponent_Template_form_ngSubmit_18_listener() {
        return ctx.submit();
      });
      \u0275\u0275elementStart(19, "div", 13)(20, "label", 14);
      \u0275\u0275text(21, "Your full name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "input", 15);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_22_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.name, $event) || (ctx.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(23, "div", 13)(24, "label", 16);
      \u0275\u0275text(25, "Company name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "input", 17);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_26_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.orgName, $event) || (ctx.orgName = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(27, "div", 13)(28, "label", 18);
      \u0275\u0275text(29, "Work email");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "div", 19);
      \u0275\u0275element(31, "app-icon", 20);
      \u0275\u0275elementStart(32, "input", 21);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_32_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(33, "div", 13)(34, "label", 22);
      \u0275\u0275text(35, "Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "div", 19);
      \u0275\u0275element(37, "app-icon", 23);
      \u0275\u0275elementStart(38, "input", 24);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_input_ngModelChange_38_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "button", 25);
      \u0275\u0275listener("click", function RegisterComponent_Template_button_click_39_listener() {
        return ctx.showPassword.set(!ctx.showPassword());
      });
      \u0275\u0275element(40, "app-icon", 26);
      \u0275\u0275elementEnd()();
      \u0275\u0275template(41, RegisterComponent_Conditional_41_Template, 2, 0, "span", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "div", 13)(43, "label", 28);
      \u0275\u0275text(44, "State (for GST)");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "select", 29);
      \u0275\u0275twoWayListener("ngModelChange", function RegisterComponent_Template_select_ngModelChange_45_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.stateCode, $event) || (ctx.stateCode = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(46, RegisterComponent_For_47_Template, 2, 3, "option", 30, _forTrack0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(48, "span", 31);
      \u0275\u0275text(49, "Used to decide CGST/SGST vs IGST on your invoices.");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(50, RegisterComponent_Conditional_50_Template, 2, 1, "div", 32);
      \u0275\u0275elementStart(51, "button", 33);
      \u0275\u0275template(52, RegisterComponent_Conditional_52_Template, 2, 0)(53, RegisterComponent_Conditional_53_Template, 2, 1, "app-icon", 34);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(54, "p", 35);
      \u0275\u0275text(55, " Already have an account? ");
      \u0275\u0275elementStart(56, "a", 36);
      \u0275\u0275text(57, "Sign in");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(58, "section", 37);
      \u0275\u0275element(59, "app-auth-preview-card", 38);
      \u0275\u0275elementStart(60, "div")(61, "h2");
      \u0275\u0275text(62, "Launch-ready from day one.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "p");
      \u0275\u0275text(64, " Your organisation gets its own isolated workspace \u2014 clients, invoices, payments and team roles \u2014 with GST math handled server-side, every time. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(65, "div", 39)(66, "span", 40);
      \u0275\u0275element(67, "app-icon", 41);
      \u0275\u0275text(68, " Tenant isolation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "span", 40);
      \u0275\u0275element(70, "app-icon", 41);
      \u0275\u0275text(71, " Invoice numbering");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(72, "span", 40);
      \u0275\u0275element(73, "app-icon", 41);
      \u0275\u0275text(74, " Free trial");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(75, "div", 42)(76, "span");
      \u0275\u0275element(77, "app-icon", 43);
      \u0275\u0275text(78, " Isolated data per organisation");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(79, "span");
      \u0275\u0275element(80, "app-icon", 44);
      \u0275\u0275text(81, " Encrypted credentials");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(82, "span");
      \u0275\u0275element(83, "app-icon", 9);
      \u0275\u0275text(84, " No credit card required");
      \u0275\u0275elementEnd()()()()();
    }
    if (rf & 2) {
      let tmp_0_0;
      let tmp_1_0;
      let tmp_2_0;
      let tmp_20_0;
      let tmp_21_0;
      \u0275\u0275advance(4);
      \u0275\u0275conditional(((tmp_0_0 = ctx.branding()) == null ? null : tmp_0_0.logoUrl) ? 4 : 5);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(((tmp_1_0 = ctx.branding()) == null ? null : tmp_1_0.appName) || "Klogu Bizz");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(((tmp_2_0 = ctx.branding()) == null ? null : tmp_2_0.tagline) || "GST Billing Suite");
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 11);
      \u0275\u0275advance(10);
      \u0275\u0275twoWayProperty("ngModel", ctx.name);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.orgName);
      \u0275\u0275advance(5);
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
      \u0275\u0275conditional(ctx.password && ctx.password.length < 8 ? 41 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.stateCode);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.error() ? 50 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.loading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 52 : 53);
      \u0275\u0275advance(6);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + (((tmp_20_0 = ctx.branding()) == null ? null : tmp_20_0.primaryColor) || "#1e1b4b") + " 0%," + (((tmp_20_0 = ctx.branding()) == null ? null : tmp_20_0.secondaryColor) || "#312e81") + " 55%," + (((tmp_20_0 = ctx.branding()) == null ? null : tmp_20_0.accentColor) || "#4f46e5") + " 100%)");
      \u0275\u0275advance();
      \u0275\u0275property("accentColor", ((tmp_21_0 = ctx.branding()) == null ? null : tmp_21_0.accentColor) || "#818cf8");
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
  }, dependencies: [FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterLink, IconComponent, AuthPreviewCardComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RegisterComponent, { className: "RegisterComponent", filePath: "src\\app\\features\\auth\\register.component.ts", lineNumber: 111 });
})();
export {
  RegisterComponent
};
//# sourceMappingURL=chunk-3WO7UXMP.js.map
