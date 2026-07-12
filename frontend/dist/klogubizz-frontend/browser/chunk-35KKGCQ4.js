import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-I22U2CHU.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  fmtDate
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  AuthService
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
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
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/super-admin/profile.component.ts
var _forTrack0 = ($index, $item) => $item.label;
var _forTrack1 = ($index, $item) => $item._id;
function SuperProfileComponent_Conditional_60_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const rule_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("color", rule_r1.test(ctx_r1.newPassword) ? "var(--green)" : "var(--faint)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", rule_r1.test(ctx_r1.newPassword) ? "\u2713" : "\u25CB", " ", rule_r1.label, " ");
  }
}
function SuperProfileComponent_Conditional_60_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 35);
    \u0275\u0275text(1, "\u2717 Passwords do not match");
    \u0275\u0275elementEnd();
  }
}
function SuperProfileComponent_Conditional_60_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 20);
    \u0275\u0275repeaterCreate(1, SuperProfileComponent_Conditional_60_For_2_Template, 2, 4, "div", 34, _forTrack0);
    \u0275\u0275template(3, SuperProfileComponent_Conditional_60_Conditional_3_Template, 2, 0, "div", 35);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.rules);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.confirmPassword && ctx_r1.confirmPassword !== ctx_r1.newPassword ? 3 : -1);
  }
}
function SuperProfileComponent_Conditional_75_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28);
    \u0275\u0275text(1, "\u2713 2FA is enabled. Your account is protected with an authenticator app.");
    \u0275\u0275elementEnd();
  }
}
function SuperProfileComponent_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 31);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function SuperProfileComponent_Conditional_84_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 36)(1, "div", 37);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 38)(4, "div", 39);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 40);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const log_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.iconFor(log_r3));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.humanize(log_r3.action));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", log_r3.actorName || "System", " \xB7 ", ctx_r1.fmtDate(log_r3.createdAt), "");
  }
}
function SuperProfileComponent_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 32);
    \u0275\u0275repeaterCreate(1, SuperProfileComponent_Conditional_84_For_2_Template, 8, 4, "div", 36, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.logs());
  }
}
function SuperProfileComponent_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 33);
  }
}
var SuperProfileComponent = class _SuperProfileComponent {
  api;
  auth;
  toast;
  loading = signal(true);
  saving = signal(false);
  logs = signal([]);
  name = "";
  email = "";
  phone = "";
  timezone = "Asia/Kolkata";
  twoFactor = false;
  currentPassword = "";
  newPassword = "";
  confirmPassword = "";
  fmtDate = fmtDate;
  rules = [
    { label: "8+ characters", test: (p) => p.length >= 8 },
    { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "Number", test: (p) => /\d/.test(p) },
    { label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) }
  ];
  constructor(api, auth, toast) {
    this.api = api;
    this.auth = auth;
    this.toast = toast;
  }
  ngOnInit() {
    this.name = this.auth.user()?.name || "";
    this.email = this.auth.user()?.email || "";
    this.api.superAuditLogs(30).subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  canChangePassword() {
    return !!this.currentPassword && this.rules.every((r) => r.test(this.newPassword)) && this.newPassword === this.confirmPassword;
  }
  changePassword() {
    this.saving.set(true);
    this.api.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.currentPassword = this.newPassword = this.confirmPassword = "";
        this.toast.success("Password updated");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  saveProfile() {
    this.toast.success("Profile saved");
  }
  iconFor(log) {
    const a = log.action || "";
    if (a.startsWith("invoice"))
      return "\u25E7";
    if (a.startsWith("org"))
      return "\u{1F3E2}";
    if (a.startsWith("plan"))
      return "\u{1F4B3}";
    if (a.startsWith("user"))
      return "\u{1F464}";
    if (a.startsWith("subscription"))
      return "\u2B21";
    if (a.startsWith("payment"))
      return "\u25C8";
    return "\u2699";
  }
  humanize(action) {
    return (action || "").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  static \u0275fac = function SuperProfileComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperProfileComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperProfileComponent, selectors: [["app-super-profile"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 86, vars: 17, consts: [[1, "page-head"], [1, "grid", "grid-2", 2, "align-items", "start"], [2, "display", "grid", "gap", "16px"], [1, "card"], [1, "card-title", 2, "margin-bottom", "16px"], [2, "display", "flex", "align-items", "center", "gap", "14px", "margin-bottom", "18px"], [3, "name", "size"], [2, "font-weight", "700", "font-size", "15px"], [2, "font-size", "12px", "color", "var(--muted)"], [2, "display", "inline-block", "margin-top", "6px", "font-size", "10px", "font-weight", "800", "background", "var(--red-bg)", "color", "var(--red)", "border-radius", "6px", "padding", "3px 8px"], [1, "form"], [1, "field"], [3, "ngModelChange", "ngModel"], [3, "ngModel", "readOnly"], ["placeholder", "+91 \u2026", 3, "ngModelChange", "ngModel"], ["value", "Asia/Kolkata"], ["value", "UTC"], ["type", "button", 1, "btn", "primary", "sm", 3, "click"], ["type", "password", "autocomplete", "current-password", 3, "ngModelChange", "ngModel"], ["type", "password", "autocomplete", "new-password", 3, "ngModelChange", "ngModel"], [2, "display", "grid", "gap", "5px", "font-size", "12px"], ["type", "button", 1, "btn", "primary", "sm", 3, "click", "disabled"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "12px"], [1, "card-title"], [1, "card-sub"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "info-box", "ok", 2, "margin-top", "14px"], [1, "card", "flush"], [1, "card-head"], [3, "count"], [2, "max-height", "520px", "overflow-y", "auto"], ["icon", "\u2699", "title", "No activity yet", "message", "Platform actions will appear here."], [3, "color"], [2, "color", "var(--red)"], [2, "display", "flex", "align-items", "center", "gap", "12px", "padding", "11px 20px", "border-bottom", "1px solid var(--border)"], [2, "width", "28px", "height", "28px", "border-radius", "50%", "background", "var(--brand-pale)", "display", "grid", "place-items", "center", "font-size", "13px", "flex-shrink", "0"], [2, "flex", "1", "min-width", "0"], [2, "font-size", "12px", "font-weight", "700"], [2, "font-size", "11px", "color", "var(--muted)"]], template: function SuperProfileComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Profile & Security");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "Your super admin account");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(6, "div", 1)(7, "div", 2)(8, "section", 3)(9, "div", 4);
      \u0275\u0275text(10, "Profile Information");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "div", 5);
      \u0275\u0275element(12, "app-avatar", 6);
      \u0275\u0275elementStart(13, "div")(14, "div", 7);
      \u0275\u0275text(15);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "div", 8);
      \u0275\u0275text(17);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "span", 9);
      \u0275\u0275text(19, "\u{1F512} SUPER ADMIN");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(20, "div", 10)(21, "div", 11)(22, "label");
      \u0275\u0275text(23, "Full Name");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "input", 12);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_24_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.name, $event) || (ctx.name = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(25, "div", 11)(26, "label");
      \u0275\u0275text(27, "Email Address");
      \u0275\u0275elementEnd();
      \u0275\u0275element(28, "input", 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "div", 11)(30, "label");
      \u0275\u0275text(31, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "input", 14);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_32_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.phone, $event) || (ctx.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(33, "div", 11)(34, "label");
      \u0275\u0275text(35, "Timezone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "select", 12);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_select_ngModelChange_36_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.timezone, $event) || (ctx.timezone = $event);
        return $event;
      });
      \u0275\u0275elementStart(37, "option", 15);
      \u0275\u0275text(38, "Asia/Kolkata (IST)");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "option", 16);
      \u0275\u0275text(40, "UTC");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(41, "div")(42, "button", 17);
      \u0275\u0275listener("click", function SuperProfileComponent_Template_button_click_42_listener() {
        return ctx.saveProfile();
      });
      \u0275\u0275text(43, "Save Profile");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(44, "section", 3)(45, "div", 4);
      \u0275\u0275text(46, "Change Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 10)(48, "div", 11)(49, "label");
      \u0275\u0275text(50, "Current Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "input", 18);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_51_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.currentPassword, $event) || (ctx.currentPassword = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(52, "div", 11)(53, "label");
      \u0275\u0275text(54, "New Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(55, "input", 19);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_55_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.newPassword, $event) || (ctx.newPassword = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(56, "div", 11)(57, "label");
      \u0275\u0275text(58, "Confirm New Password");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "input", 19);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_59_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.confirmPassword, $event) || (ctx.confirmPassword = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275template(60, SuperProfileComponent_Conditional_60_Template, 4, 1, "div", 20);
      \u0275\u0275elementStart(61, "div")(62, "button", 21);
      \u0275\u0275listener("click", function SuperProfileComponent_Template_button_click_62_listener() {
        return ctx.changePassword();
      });
      \u0275\u0275text(63, "Update Password");
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(64, "div", 2)(65, "section", 3)(66, "div", 22)(67, "div")(68, "div", 23);
      \u0275\u0275text(69, "Two-Factor Authentication");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(70, "div", 24);
      \u0275\u0275text(71, "Add an extra layer of security to your account");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(72, "label", 25)(73, "input", 26);
      \u0275\u0275twoWayListener("ngModelChange", function SuperProfileComponent_Template_input_ngModelChange_73_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.twoFactor, $event) || (ctx.twoFactor = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(74, "span", 27);
      \u0275\u0275elementEnd()();
      \u0275\u0275template(75, SuperProfileComponent_Conditional_75_Template, 2, 0, "div", 28);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(76, "section", 29)(77, "div", 30)(78, "div")(79, "div", 23);
      \u0275\u0275text(80, "Audit Log");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(81, "div", 24);
      \u0275\u0275text(82, "Recent platform activity");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(83, SuperProfileComponent_Conditional_83_Template, 1, 1, "app-skeleton-rows", 31)(84, SuperProfileComponent_Conditional_84_Template, 3, 0, "div", 32)(85, SuperProfileComponent_Conditional_85_Template, 1, 0, "app-empty-state", 33);
      \u0275\u0275elementEnd()()();
    }
    if (rf & 2) {
      \u0275\u0275advance(12);
      \u0275\u0275property("name", ctx.name)("size", 64);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.name);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.email);
      \u0275\u0275advance(7);
      \u0275\u0275twoWayProperty("ngModel", ctx.name);
      \u0275\u0275advance(4);
      \u0275\u0275property("ngModel", ctx.email)("readOnly", true);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.phone);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.timezone);
      \u0275\u0275advance(15);
      \u0275\u0275twoWayProperty("ngModel", ctx.currentPassword);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.newPassword);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.confirmPassword);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.newPassword ? 60 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.canChangePassword() || ctx.saving());
      \u0275\u0275advance(11);
      \u0275\u0275twoWayProperty("ngModel", ctx.twoFactor);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.twoFactor ? 75 : -1);
      \u0275\u0275advance(8);
      \u0275\u0275conditional(ctx.loading() ? 83 : ctx.logs().length ? 84 : 85);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperProfileComponent, { className: "SuperProfileComponent", filePath: "src\\app\\features\\super-admin\\profile.component.ts", lineNumber: 118 });
})();
export {
  SuperProfileComponent
};
//# sourceMappingURL=chunk-35KKGCQ4.js.map
