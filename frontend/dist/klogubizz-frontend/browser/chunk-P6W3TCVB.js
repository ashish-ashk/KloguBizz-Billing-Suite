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
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  CommonModule,
  __spreadValues,
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
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/super-admin/reminders.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function SuperRemindersComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275element(1, "app-skeleton-rows", 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function SuperRemindersComponent_Conditional_7_For_9_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30)(1, "div", 16)(2, "label");
    \u0275\u0275text(3, "Email Subject");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_For_9_Conditional_12_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r5);
      const r_r3 = \u0275\u0275nextContext().$implicit;
      \u0275\u0275twoWayBindingSet(r_r3.subject, $event) || (r_r3.subject = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 31);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 16)(8, "label");
    \u0275\u0275text(9, "Email Body");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "textarea", 32);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_For_9_Conditional_12_Template_textarea_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r5);
      const r_r3 = \u0275\u0275nextContext().$implicit;
      \u0275\u0275twoWayBindingSet(r_r3.template, $event) || (r_r3.template = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div")(12, "button", 33);
    \u0275\u0275listener("click", function SuperRemindersComponent_Conditional_7_For_9_Conditional_12_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r5);
      const r_r3 = \u0275\u0275nextContext().$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.saveReminder(r_r3));
    });
    \u0275\u0275text(13, "Save");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const r_r3 = \u0275\u0275nextContext().$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", r_r3.subject);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.variablesHint);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", r_r3.template);
  }
}
function SuperRemindersComponent_Conditional_7_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 25)(2, "label", 13)(3, "input", 14);
    \u0275\u0275listener("ngModelChange", function SuperRemindersComponent_Conditional_7_For_9_Template_input_ngModelChange_3_listener($event) {
      const r_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.toggle(r_r3, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(4, "span", 15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 26)(6, "div", 27);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 28);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "button", 29);
    \u0275\u0275listener("click", function SuperRemindersComponent_Conditional_7_For_9_Template_button_click_10_listener() {
      const r_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.editing.set(ctx_r3.editing() === r_r3._id ? "" : r_r3._id));
    });
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(12, SuperRemindersComponent_Conditional_7_For_9_Conditional_12_Template, 14, 3, "div", 30);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("ngModel", r_r3.enabled);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(r_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r3.triggerText(r_r3));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r3.editing() === r_r3._id ? "Close" : "Edit", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r3.editing() === r_r3._id ? 12 : -1);
  }
}
function SuperRemindersComponent_Conditional_7_For_78_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 22);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r6 = ctx.$implicit;
    \u0275\u0275property("value", r_r6.name);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(r_r6.name);
  }
}
function SuperRemindersComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 2)(1, "div", 4)(2, "section", 5)(3, "div", 6);
    \u0275\u0275text(4, "Payment Reminder Triggers");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 7);
    \u0275\u0275text(6, "Emails sent automatically around invoice due dates");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 8);
    \u0275\u0275repeaterCreate(8, SuperRemindersComponent_Conditional_7_For_9_Template, 13, 5, "div", 9, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "section", 5)(11, "div", 10);
    \u0275\u0275text(12, "Payment Receipt Settings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 11)(14, "label", 12)(15, "span");
    \u0275\u0275text(16, "Auto-send receipt on payment");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 13)(18, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_18_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.receipt.autoSend, $event) || (ctx_r3.receipt.autoSend = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(19, "span", 15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "label", 12)(21, "span");
    \u0275\u0275text(22, "Include invoice copy in receipt");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "span", 13)(24, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.receipt.includeInvoiceCopy, $event) || (ctx_r3.receipt.includeInvoiceCopy = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(25, "span", 15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 16)(27, "label");
    \u0275\u0275text(28, "Receipt Subject Line");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_29_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.receipt.subject, $event) || (ctx_r3.receipt.subject = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 16)(31, "label");
    \u0275\u0275text(32, "Receipt Body Intro");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "textarea", 18);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_textarea_ngModelChange_33_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.receipt.bodyIntro, $event) || (ctx_r3.receipt.bodyIntro = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div")(35, "button", 19);
    \u0275\u0275listener("click", function SuperRemindersComponent_Conditional_7_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.saveSetting("receipt", ctx_r3.receipt, "Receipt settings saved"));
    });
    \u0275\u0275text(36, "Save Receipt Settings");
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(37, "div", 4)(38, "section", 5)(39, "div", 10);
    \u0275\u0275text(40, "Global Email Settings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div", 11)(42, "div", 16)(43, "label");
    \u0275\u0275text(44, "Sender Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_45_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.email.senderName, $event) || (ctx_r3.email.senderName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(46, "div", 16)(47, "label");
    \u0275\u0275text(48, "Sender Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_49_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.email.senderEmail, $event) || (ctx_r3.email.senderEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(50, "div", 16)(51, "label");
    \u0275\u0275text(52, "Reply-To Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "input", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_53_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.email.replyTo, $event) || (ctx_r3.email.replyTo = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "div", 16)(55, "label");
    \u0275\u0275text(56, "BCC (optional)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(57, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_57_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.email.bcc, $event) || (ctx_r3.email.bcc = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(58, "div", 16)(59, "label");
    \u0275\u0275text(60, "Email Footer");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "textarea", 18);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_textarea_ngModelChange_61_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.email.footer, $event) || (ctx_r3.email.footer = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(62, "div")(63, "button", 19);
    \u0275\u0275listener("click", function SuperRemindersComponent_Conditional_7_Template_button_click_63_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.saveSetting("email", ctx_r3.email, "Email settings saved"));
    });
    \u0275\u0275text(64, "Save Email Settings");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(65, "section", 5)(66, "div", 10);
    \u0275\u0275text(67, "Test Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(68, "div", 11)(69, "div", 16)(70, "label");
    \u0275\u0275text(71, "Send test to");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(72, "input", 21);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_input_ngModelChange_72_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.testTo, $event) || (ctx_r3.testTo = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(73, "div", 16)(74, "label");
    \u0275\u0275text(75, "Template to test");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(76, "select", 17);
    \u0275\u0275twoWayListener("ngModelChange", function SuperRemindersComponent_Conditional_7_Template_select_ngModelChange_76_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.testTemplate, $event) || (ctx_r3.testTemplate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(77, SuperRemindersComponent_Conditional_7_For_78_Template, 2, 2, "option", 22, _forTrack0);
    \u0275\u0275elementStart(79, "option", 23);
    \u0275\u0275text(80, "Payment Receipt");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(81, "div")(82, "button", 24);
    \u0275\u0275listener("click", function SuperRemindersComponent_Conditional_7_Template_button_click_82_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.sendTest());
    });
    \u0275\u0275text(83, "Send Test Email");
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r3.reminders());
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.receipt.autoSend);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.receipt.includeInvoiceCopy);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.receipt.subject);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.receipt.bodyIntro);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r3.saving());
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.email.senderName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.email.senderEmail);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.email.replyTo);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.email.bcc);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.email.footer);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r3.saving());
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.testTo);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.testTemplate);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.reminders());
  }
}
var SuperRemindersComponent = class _SuperRemindersComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  reminders = signal([]);
  editing = signal("");
  testTo = "";
  testTemplate = "";
  variablesHint = "Variables: {{invoice_id}} {{client_name}} {{amount}} {{due_date}}";
  receipt = { autoSend: true, includeInvoiceCopy: true, subject: "", bodyIntro: "" };
  email = { senderName: "", senderEmail: "", replyTo: "", bcc: "", footer: "" };
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.api.superMasters().subscribe({
      next: (res) => {
        this.reminders.set(res.reminders);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
    this.api.superSettings().subscribe({
      next: (s) => {
        if (s["receipt"])
          this.receipt = __spreadValues(__spreadValues({}, this.receipt), s["receipt"]);
        if (s["email"])
          this.email = __spreadValues(__spreadValues({}, this.email), s["email"]);
      }
    });
  }
  triggerText(r) {
    if (r.daysOffset === 0)
      return "On due date";
    if (r.daysOffset < 0)
      return `${-r.daysOffset} day(s) before due date`;
    return `${r.daysOffset} day(s) after due date`;
  }
  toggle(r, enabled) {
    this.api.superUpdateReminder(r._id, { enabled }).subscribe({
      next: () => this.toast.success(`${r.name} ${enabled ? "enabled" : "disabled"}`),
      error: (err) => this.toast.httpError(err)
    });
  }
  saveReminder(r) {
    this.api.superUpdateReminder(r._id, { subject: r.subject, template: r.template }).subscribe({
      next: () => {
        this.editing.set("");
        this.toast.success("Reminder template saved");
      },
      error: (err) => this.toast.httpError(err)
    });
  }
  saveSetting(key, value, msg) {
    this.saving.set(true);
    this.api.superSaveSetting(key, value).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(msg);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  sendTest() {
    if (!this.testTo.trim()) {
      this.toast.error("Enter a test recipient email.");
      return;
    }
    this.toast.info("Test email queued (SendGrid is not configured in local mode)");
  }
  static \u0275fac = function SuperRemindersComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperRemindersComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperRemindersComponent, selectors: [["app-super-reminders"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 8, vars: 1, consts: [[1, "page-head"], [1, "card", "flush"], [1, "grid", "grid-2", 2, "align-items", "start"], [3, "count"], [2, "display", "grid", "gap", "16px"], [1, "card"], [1, "card-title", 2, "margin-bottom", "4px"], [1, "card-sub", 2, "margin-bottom", "16px"], [2, "display", "grid", "gap", "12px"], [2, "border", "1px solid var(--border)", "border-radius", "10px", "padding", "12px 14px"], [1, "card-title", 2, "margin-bottom", "14px"], [1, "form"], [1, "checkbox", 2, "justify-content", "space-between"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "field"], [3, "ngModelChange", "ngModel"], ["rows", "2", 3, "ngModelChange", "ngModel"], ["type", "button", 1, "btn", "primary", "sm", 3, "click", "disabled"], ["placeholder", "admin@klogubizz.com", 3, "ngModelChange", "ngModel"], ["placeholder", "you@company.com", 3, "ngModelChange", "ngModel"], [3, "value"], ["value", "receipt"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], [2, "display", "flex", "align-items", "center", "gap", "12px"], [2, "flex", "1"], [2, "font-weight", "700", "font-size", "13px"], [2, "font-size", "11.5px", "color", "var(--muted)"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], [1, "form", 2, "margin-top", "12px", "padding-top", "12px", "border-top", "1px solid var(--border)"], [1, "hint"], ["rows", "3", 3, "ngModelChange", "ngModel"], ["type", "button", 1, "btn", "primary", "sm", 3, "click"]], template: function SuperRemindersComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Reminders & Receipts");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "Automated payment communication");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(6, SuperRemindersComponent_Conditional_6_Template, 2, 1, "div", 1)(7, SuperRemindersComponent_Conditional_7_Template, 84, 13, "div", 2);
    }
    if (rf & 2) {
      \u0275\u0275advance(6);
      \u0275\u0275conditional(ctx.loading() ? 6 : 7);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperRemindersComponent, { className: "SuperRemindersComponent", filePath: "src\\app\\features\\super-admin\\reminders.component.ts", lineNumber: 114 });
})();
export {
  SuperRemindersComponent
};
//# sourceMappingURL=chunk-P6W3TCVB.js.map
