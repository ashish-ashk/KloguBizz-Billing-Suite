import {
  CUSTOM_TEMPLATE_ID,
  DEFAULT_CUSTOM_INVOICE_TEMPLATE,
  DIVIDER_STYLE_OPTIONS,
  FONT_OPTIONS,
  HEADER_STYLE_OPTIONS,
  INVOICE_TEMPLATES,
  InvoiceDocumentComponent,
  PAPER_TONE_OPTIONS,
  TABLE_STYLE_OPTIONS,
  TITLE_ALIGN_OPTIONS
} from "./chunk-M35RZKI5.js";
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
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  ToastService
} from "./chunk-JIDZ6YQM.js";
import "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  AuthService
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
  __spreadProps,
  __spreadValues,
  computed,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuery
} from "./chunk-KLA3EWNB.js";

// src/app/features/invoice-templates/invoice-templates.component.ts
var _c0 = ["logoInput"];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.value;
function InvoiceTemplatesComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 4);
  }
}
function InvoiceTemplatesComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 40);
    \u0275\u0275elementStart(1, "div", 41);
    \u0275\u0275text(2, "\u2705 Uploaded \u2014 click to replace");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("src", ctx_r2.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceTemplatesComponent_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275text(1, "\u{1F4C1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 43);
    \u0275\u0275text(3, "Click to upload your logo");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 44);
    \u0275\u0275listener("click", function InvoiceTemplatesComponent_Conditional_23_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.removeLogo());
    });
    \u0275\u0275text(1, "Remove logo");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 26);
    \u0275\u0275text(1, "\u2713 Active");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_74_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 46);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_74_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 45);
    \u0275\u0275listener("click", function InvoiceTemplatesComponent_For_74_Template_button_click_0_listener() {
      const t_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectPreset(t_r6.id));
    });
    \u0275\u0275template(1, InvoiceTemplatesComponent_For_74_Conditional_1_Template, 2, 0, "span", 46);
    \u0275\u0275elementStart(2, "span", 47);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 48)(5, "span", 49);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 50);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const t_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("selected", ctx_r2.mode() === "preset" && ctx_r2.selectedTemplateId() === t_r6.id);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.savedMode() === "preset" && ctx_r2.savedTemplateId() === t_r6.id ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", ctx_r2.accentColor());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(t_r6.name.slice(0, 2).toUpperCase());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(t_r6.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(t_r6.description);
  }
}
function InvoiceTemplatesComponent_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 26);
    \u0275\u0275text(1, "\u2713 Active");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 28);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_90_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const f_r7 = ctx.$implicit;
    \u0275\u0275property("value", f_r7.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(f_r7.label);
  }
}
function InvoiceTemplatesComponent_For_97_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const h_r8 = ctx.$implicit;
    \u0275\u0275property("value", h_r8.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(h_r8.label);
  }
}
function InvoiceTemplatesComponent_For_103_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const a_r9 = ctx.$implicit;
    \u0275\u0275property("value", a_r9.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(a_r9.label);
  }
}
function InvoiceTemplatesComponent_For_110_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const t_r10 = ctx.$implicit;
    \u0275\u0275property("value", t_r10.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(t_r10.label);
  }
}
function InvoiceTemplatesComponent_For_116_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const d_r11 = ctx.$implicit;
    \u0275\u0275property("value", d_r11.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(d_r11.label);
  }
}
function InvoiceTemplatesComponent_For_122_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 32);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r12 = ctx.$implicit;
    \u0275\u0275property("value", p_r12.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r12.label);
  }
}
var DEFAULT_CONTENT = {
  showLogo: true,
  showSignature: true,
  showBankDetails: true,
  showAmountInWords: true,
  showGstBreakdown: true
};
var SAMPLE_INVOICE = {
  invoiceNumber: "KLG-2026-001",
  date: new Date(2026, 6, 1).toISOString(),
  dueDate: new Date(2026, 6, 16).toISOString(),
  items: [
    { desc: "Web Development Services", hsn: "998314", qty: 1, rate: 45e3, gstRate: 18 },
    { desc: "UI/UX Design", hsn: "998314", qty: 1, rate: 15e3, gstRate: 18 }
  ],
  totals: { subtotal: 6e4, cgst: 5400, sgst: 5400, igst: 0, total: 70800, isIGST: false },
  notes: "Thank you for your business!",
  paymentTerms: "Net 15",
  bankDetails: { bank: "HDFC Bank", account: "50100123456789", ifsc: "HDFC0001234" }
};
var SAMPLE_CLIENT = {
  companyName: "Acme Traders Pvt Ltd",
  address: "BKC, Mumbai, Maharashtra 400051",
  gstin: "27AAAAA0000A1Z5",
  stateCode: "27"
};
var InvoiceTemplatesComponent = class _InvoiceTemplatesComponent {
  auth;
  api;
  toast;
  logoInputRef;
  templates = INVOICE_TEMPLATES;
  fontOptions = FONT_OPTIONS;
  headerStyleOptions = HEADER_STYLE_OPTIONS;
  titleAlignOptions = TITLE_ALIGN_OPTIONS;
  tableStyleOptions = TABLE_STYLE_OPTIONS;
  dividerStyleOptions = DIVIDER_STYLE_OPTIONS;
  paperToneOptions = PAPER_TONE_OPTIONS;
  sampleInvoice = SAMPLE_INVOICE;
  sampleClient = SAMPLE_CLIENT;
  logoUrl = signal("");
  accentColor = signal("#4f46e5");
  mode = signal("preset");
  selectedTemplateId = signal("classic-corporate");
  customTemplate = signal(__spreadValues({}, DEFAULT_CUSTOM_INVOICE_TEMPLATE));
  content = signal(__spreadValues({}, DEFAULT_CONTENT));
  savedLogoUrl = signal("");
  savedAccentColor = signal("#4f46e5");
  savedMode = signal("preset");
  savedTemplateId = signal("classic-corporate");
  savedCustomTemplate = signal(__spreadValues({}, DEFAULT_CUSTOM_INVOICE_TEMPLATE));
  savedContent = signal(__spreadValues({}, DEFAULT_CONTENT));
  saving = signal(false);
  /** The template id actually sent to the preview/backend: the real catalog
   *  id when browsing presets, or the reserved 'custom' id when editing a
   *  custom build (its details travel separately in `customTemplate`). */
  effectiveTemplateId = computed(() => this.mode() === "custom" ? CUSTOM_TEMPLATE_ID : this.selectedTemplateId());
  selectedTemplateName = computed(() => this.templates.find((t) => t.id === this.selectedTemplateId())?.name || "Template");
  dirty = computed(() => this.logoUrl() !== this.savedLogoUrl() || this.accentColor() !== this.savedAccentColor() || this.mode() !== this.savedMode() || (this.mode() === "preset" ? this.selectedTemplateId() !== this.savedTemplateId() : false) || (this.mode() === "custom" ? JSON.stringify(this.customTemplate()) !== JSON.stringify(this.savedCustomTemplate()) : false) || JSON.stringify(this.content()) !== JSON.stringify(this.savedContent()));
  constructor(auth, api, toast) {
    this.auth = auth;
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    const branding = this.auth.organisation()?.brandingConfig || {};
    const logo = branding.logoUrl || "";
    const accent = branding.primaryColor || "#4f46e5";
    const templateId = branding.invoiceTemplateId || "classic-corporate";
    const isCustom = templateId === CUSTOM_TEMPLATE_ID;
    const custom = __spreadValues(__spreadValues({}, DEFAULT_CUSTOM_INVOICE_TEMPLATE), branding.customInvoiceTemplate || {});
    const content = __spreadValues(__spreadValues({}, DEFAULT_CONTENT), branding.invoiceContent || {});
    this.logoUrl.set(logo);
    this.savedLogoUrl.set(logo);
    this.accentColor.set(accent);
    this.savedAccentColor.set(accent);
    this.mode.set(isCustom ? "custom" : "preset");
    this.savedMode.set(isCustom ? "custom" : "preset");
    this.selectedTemplateId.set(isCustom ? "classic-corporate" : templateId);
    this.savedTemplateId.set(isCustom ? "classic-corporate" : templateId);
    this.customTemplate.set(custom);
    this.savedCustomTemplate.set(custom);
    this.content.set(content);
    this.savedContent.set(content);
  }
  selectPreset(id) {
    this.mode.set("preset");
    this.selectedTemplateId.set(id);
  }
  setCustom(key, value) {
    this.mode.set("custom");
    this.customTemplate.update((c) => __spreadProps(__spreadValues({}, c), { [key]: value }));
  }
  setContent(key, value) {
    this.content.update((c) => __spreadProps(__spreadValues({}, c), { [key]: value }));
  }
  onLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file)
      return;
    if (file.size > 500 * 1024) {
      this.toast.error("Logo image must be under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.logoUrl.set(reader.result);
    reader.readAsDataURL(file);
  }
  removeLogo() {
    this.logoUrl.set("");
  }
  discard() {
    this.logoUrl.set(this.savedLogoUrl());
    this.accentColor.set(this.savedAccentColor());
    this.mode.set(this.savedMode());
    this.selectedTemplateId.set(this.savedTemplateId());
    this.customTemplate.set(__spreadValues({}, this.savedCustomTemplate()));
    this.content.set(__spreadValues({}, this.savedContent()));
  }
  save() {
    const current = this.auth.organisation()?.brandingConfig || {};
    this.saving.set(true);
    this.api.updateOrganisation({
      brandingConfig: __spreadProps(__spreadValues({}, current), {
        logoUrl: this.logoUrl(),
        primaryColor: this.accentColor(),
        invoiceTemplateId: this.effectiveTemplateId(),
        customInvoiceTemplate: this.customTemplate(),
        invoiceContent: this.content()
      })
    }).subscribe({
      next: (org) => {
        this.saving.set(false);
        this.auth.setOrganisation(org);
        this.savedLogoUrl.set(this.logoUrl());
        this.savedAccentColor.set(this.accentColor());
        this.savedMode.set(this.mode());
        this.savedTemplateId.set(this.selectedTemplateId());
        this.savedCustomTemplate.set(__spreadValues({}, this.customTemplate()));
        this.savedContent.set(__spreadValues({}, this.content()));
        this.toast.success("Invoice template saved");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function InvoiceTemplatesComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoiceTemplatesComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoiceTemplatesComponent, selectors: [["app-invoice-templates"]], viewQuery: function InvoiceTemplatesComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.logoInputRef = _t.first);
    }
  }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 147, vars: 38, consts: [["logoInput", ""], ["title", "Invoice Templates", "subtitle", "Choose how your invoices and bills look, and add your company logo"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], [1, "info-box", 2, "margin-bottom", "20px"], [2, "display", "grid", "grid-template-columns", "380px 1fr", "gap", "24px", "align-items", "start"], [2, "display", "grid", "gap", "20px"], [1, "card"], [1, "card-title", 2, "margin-bottom", "4px"], [1, "card-sub", 2, "margin-bottom", "12px"], ["type", "button", 2, "width", "100%", "border", "2px dashed var(--border)", "border-radius", "10px", "padding", "20px", "text-align", "center", "background", "var(--card)", "cursor", "pointer", 3, "click"], ["type", "file", "accept", "image/*", "hidden", "", 3, "change"], ["type", "button", 1, "btn", "ghost", "sm", 2, "margin-top", "8px"], [1, "card-title", 2, "margin-bottom", "12px"], [2, "display", "flex", "align-items", "center", "gap", "10px"], ["type", "color", 2, "width", "42px", "height", "42px", "border", "1px solid var(--border)", "border-radius", "8px", "padding", "2px", "background", "var(--card)", "cursor", "pointer", "flex-shrink", "0", 3, "ngModelChange", "ngModel"], [1, "mono", 3, "ngModelChange", "ngModel"], [2, "display", "grid", "gap", "10px"], [1, "checkbox", 2, "justify-content", "space-between"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], [1, "pill", "active"], ["type", "button", 1, "theme-card", 3, "selected"], [1, "theme-current-badge", 2, "position", "static"], [1, "form"], [1, "field"], [3, "ngModelChange", "ngModel"], [3, "value"], [1, "grid", "grid-2"], [1, "hint", 2, "text-transform", "none"], [2, "position", "sticky", "top", "20px"], [1, "card-sub", 2, "margin-bottom", "10px", "display", "flex", "justify-content", "space-between", "align-items", "center"], [1, "pill"], [2, "border", "1px solid var(--border)", "border-radius", "14px", "overflow", "hidden", "box-shadow", "var(--shadow-md)"], [3, "invoice", "client", "orgName", "orgAddress", "orgGstin", "orgPan", "templateId", "customTemplate", "accentColor", "logoUrl", "showLogo", "showSignature", "showBankDetails", "showAmountInWords"], ["alt", "Logo", 2, "max-height", "40px", "max-width", "100%", "display", "block", "margin", "0 auto 8px", 3, "src"], [2, "font-size", "11px", "color", "var(--green)", "font-weight", "600"], [2, "font-size", "22px"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "6px"], ["type", "button", 1, "btn", "ghost", "sm", 2, "margin-top", "8px", 3, "click"], ["type", "button", 1, "theme-card", 3, "click"], [1, "theme-current-badge"], [2, "width", "44px", "height", "36px", "border-radius", "6px", "flex-shrink", "0", "display", "grid", "place-items", "center", "font-size", "9px", "font-weight", "700", "color", "#fff"], [1, "theme-card-info"], [1, "theme-card-name"], [2, "font-size", "11px", "color", "var(--muted)"]], template: function InvoiceTemplatesComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "app-shell", 1)(1, "button", 2);
      \u0275\u0275listener("click", function InvoiceTemplatesComponent_Template_button_click_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.discard());
      });
      \u0275\u0275text(2, "Discard Changes");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(3, "button", 3);
      \u0275\u0275listener("click", function InvoiceTemplatesComponent_Template_button_click_3_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.save());
      });
      \u0275\u0275template(4, InvoiceTemplatesComponent_Conditional_4_Template, 1, 0, "span", 4);
      \u0275\u0275text(5, " Save Template ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "div", 5);
      \u0275\u0275text(7, " \u{1F4C4} Pick from 10 authentic layouts, or build your own from scratch below. Add your logo and toggle what appears on the document. The preview on the right updates instantly \u2014 nothing changes for your real invoices until you hit ");
      \u0275\u0275elementStart(8, "strong");
      \u0275\u0275text(9, "Save Template");
      \u0275\u0275elementEnd();
      \u0275\u0275text(10, ". ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "div", 6)(12, "div", 7)(13, "section", 8)(14, "div", 9);
      \u0275\u0275text(15, "Company Logo");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "div", 10);
      \u0275\u0275text(17, "Shown in your sidebar and on every invoice header");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "button", 11);
      \u0275\u0275listener("click", function InvoiceTemplatesComponent_Template_button_click_18_listener() {
        \u0275\u0275restoreView(_r1);
        const logoInput_r2 = \u0275\u0275reference(22);
        return \u0275\u0275resetView(logoInput_r2.click());
      });
      \u0275\u0275template(19, InvoiceTemplatesComponent_Conditional_19_Template, 3, 1)(20, InvoiceTemplatesComponent_Conditional_20_Template, 4, 0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(21, "input", 12, 0);
      \u0275\u0275listener("change", function InvoiceTemplatesComponent_Template_input_change_21_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onLogoFile($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(23, InvoiceTemplatesComponent_Conditional_23_Template, 2, 0, "button", 13);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "section", 8)(25, "div", 14);
      \u0275\u0275text(26, "Accent Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "div", 15)(28, "input", 16);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_28_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.accentColor.set($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "input", 17);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_29_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.accentColor.set($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(30, "section", 8)(31, "div", 14);
      \u0275\u0275text(32, "Invoice Content");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "div", 18)(34, "label", 19)(35, "span");
      \u0275\u0275text(36, "Company logo");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "span", 20)(38, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_38_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showLogo", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(39, "span", 22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(40, "label", 19)(41, "span");
      \u0275\u0275text(42, "Authorised signature");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(43, "span", 20)(44, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_44_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showSignature", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(45, "span", 22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "label", 19)(47, "span");
      \u0275\u0275text(48, "Bank details section");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "span", 20)(50, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_50_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showBankDetails", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(51, "span", 22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(52, "label", 19)(53, "span");
      \u0275\u0275text(54, "Amount in words");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(55, "span", 20)(56, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_56_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showAmountInWords", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(57, "span", 22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(58, "label", 19)(59, "span");
      \u0275\u0275text(60, "GST rate breakdown");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "span", 20)(62, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_62_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showGstBreakdown", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(63, "span", 22);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(64, "section", 8)(65, "div", 23)(66, "div")(67, "div", 24);
      \u0275\u0275text(68, "Choose a Template");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "div", 25);
      \u0275\u0275text(70, "10 authentic layouts \u2014 click to preview instantly");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(71, InvoiceTemplatesComponent_Conditional_71_Template, 2, 0, "span", 26);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(72, "div", 18);
      \u0275\u0275repeaterCreate(73, InvoiceTemplatesComponent_For_74_Template, 9, 8, "button", 27, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(75, "section", 8)(76, "div", 23)(77, "div")(78, "div", 24);
      \u0275\u0275text(79, "Custom Template");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(80, "div", 25);
      \u0275\u0275text(81, "Build your own layout \u2014 editing any field switches the preview to your custom build");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(82, InvoiceTemplatesComponent_Conditional_82_Template, 2, 0, "span", 26)(83, InvoiceTemplatesComponent_Conditional_83_Template, 2, 0, "span", 28);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(84, "div", 29)(85, "div", 30)(86, "label");
      \u0275\u0275text(87, "Font");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(88, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_88_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("font", $event));
      });
      \u0275\u0275repeaterCreate(89, InvoiceTemplatesComponent_For_90_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(91, "div", 33)(92, "div", 30)(93, "label");
      \u0275\u0275text(94, "Header Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(95, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_95_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("headerStyle", $event));
      });
      \u0275\u0275repeaterCreate(96, InvoiceTemplatesComponent_For_97_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(98, "div", 30)(99, "label");
      \u0275\u0275text(100, "Title Alignment");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(101, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_101_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("titleAlign", $event));
      });
      \u0275\u0275repeaterCreate(102, InvoiceTemplatesComponent_For_103_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(104, "div", 33)(105, "div", 30)(106, "label");
      \u0275\u0275text(107, "Table Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(108, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_108_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("tableStyle", $event));
      });
      \u0275\u0275repeaterCreate(109, InvoiceTemplatesComponent_For_110_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(111, "div", 30)(112, "label");
      \u0275\u0275text(113, "Divider Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(114, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_114_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("dividerStyle", $event));
      });
      \u0275\u0275repeaterCreate(115, InvoiceTemplatesComponent_For_116_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(117, "div", 30)(118, "label");
      \u0275\u0275text(119, "Paper Tone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(120, "select", 31);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_120_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("paperTone", $event));
      });
      \u0275\u0275repeaterCreate(121, InvoiceTemplatesComponent_For_122_Template, 2, 2, "option", 32, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(123, "label", 19)(124, "span");
      \u0275\u0275text(125, "Compact rows ");
      \u0275\u0275elementStart(126, "span", 34);
      \u0275\u0275text(127, "\u2014 tighter spacing for invoices with many line items");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(128, "span", 20)(129, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_129_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("compact", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(130, "span", 22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(131, "label", 19)(132, "span");
      \u0275\u0275text(133, "Narrow margins ");
      \u0275\u0275elementStart(134, "span", 34);
      \u0275\u0275text(135, "\u2014 receipt-style content width");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(136, "span", 20)(137, "input", 21);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_137_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("narrow", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(138, "span", 22);
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(139, "div", 35)(140, "div", 36)(141, "span");
      \u0275\u0275text(142, "Live Preview \u2014 sample invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(143, "span", 37);
      \u0275\u0275text(144);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(145, "div", 38);
      \u0275\u0275element(146, "app-invoice-document", 39);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_34_0;
      let tmp_35_0;
      let tmp_36_0;
      let tmp_37_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.dirty());
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.dirty() || ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 4 : -1);
      \u0275\u0275advance(15);
      \u0275\u0275conditional(ctx.logoUrl() ? 19 : 20);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.logoUrl() ? 23 : -1);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.accentColor());
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.accentColor());
      \u0275\u0275advance(9);
      \u0275\u0275property("ngModel", ctx.content().showLogo);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.content().showSignature);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.content().showBankDetails);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.content().showAmountInWords);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.content().showGstBreakdown);
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.mode() === "preset" ? 71 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.templates);
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.mode() === "custom" ? 82 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.savedMode() === "custom" ? 83 : -1);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.customTemplate().font);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.fontOptions);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.customTemplate().headerStyle);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.headerStyleOptions);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.customTemplate().titleAlign);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.titleAlignOptions);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.customTemplate().tableStyle);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.tableStyleOptions);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.customTemplate().dividerStyle);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.dividerStyleOptions);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.customTemplate().paperTone);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.paperToneOptions);
      \u0275\u0275advance(8);
      \u0275\u0275property("ngModel", ctx.customTemplate().compact);
      \u0275\u0275advance(8);
      \u0275\u0275property("ngModel", ctx.customTemplate().narrow);
      \u0275\u0275advance(7);
      \u0275\u0275textInterpolate(ctx.mode() === "custom" ? "Custom Template" : ctx.selectedTemplateName());
      \u0275\u0275advance(2);
      \u0275\u0275property("invoice", ctx.sampleInvoice)("client", ctx.sampleClient)("orgName", ((tmp_34_0 = ctx.auth.organisation()) == null ? null : tmp_34_0.name) || "Your Business")("orgAddress", ((tmp_35_0 = ctx.auth.organisation()) == null ? null : tmp_35_0.address) || "")("orgGstin", ((tmp_36_0 = ctx.auth.organisation()) == null ? null : tmp_36_0.gstin) || "")("orgPan", ((tmp_37_0 = ctx.auth.organisation()) == null ? null : tmp_37_0.pan) || "")("templateId", ctx.effectiveTemplateId())("customTemplate", ctx.customTemplate())("accentColor", ctx.accentColor())("logoUrl", ctx.content().showLogo ? ctx.logoUrl() : "")("showLogo", ctx.content().showLogo)("showSignature", ctx.content().showSignature)("showBankDetails", ctx.content().showBankDetails)("showAmountInWords", ctx.content().showAmountInWords);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, AppShellComponent, InvoiceDocumentComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoiceTemplatesComponent, { className: "InvoiceTemplatesComponent", filePath: "src\\app\\features\\invoice-templates\\invoice-templates.component.ts", lineNumber: 232 });
})();
export {
  InvoiceTemplatesComponent
};
//# sourceMappingURL=chunk-I2YMBTJX.js.map
