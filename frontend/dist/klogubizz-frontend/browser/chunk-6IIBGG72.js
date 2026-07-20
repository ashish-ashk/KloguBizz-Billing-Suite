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
} from "./chunk-GHI6Y4GD.js";
import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  ToastService
} from "./chunk-OBVHAWX5.js";
import "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import {
  AuthService
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
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
} from "./chunk-6VNHH65J.js";

// src/app/features/invoice-templates/invoice-templates.component.ts
var _c0 = ["logoInput"];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.value;
function InvoiceTemplatesComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 4);
  }
}
function InvoiceTemplatesComponent_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 41);
    \u0275\u0275elementStart(1, "div", 42);
    \u0275\u0275element(2, "app-icon", 43);
    \u0275\u0275text(3, " Uploaded \u2014 click to replace ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("src", ctx_r2.logoUrl(), \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 13);
  }
}
function InvoiceTemplatesComponent_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44);
    \u0275\u0275element(1, "app-icon", 45);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 46);
    \u0275\u0275text(3, "Click to upload your logo");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 22)("strokeWidth", 1.5);
  }
}
function InvoiceTemplatesComponent_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 47);
    \u0275\u0275listener("click", function InvoiceTemplatesComponent_Conditional_25_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.removeLogo());
    });
    \u0275\u0275text(1, "Remove logo");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 27);
    \u0275\u0275text(1, "\u2713 Active");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_76_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 49);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_76_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 48);
    \u0275\u0275listener("click", function InvoiceTemplatesComponent_For_76_Template_button_click_0_listener() {
      const t_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectPreset(t_r6.id));
    });
    \u0275\u0275template(1, InvoiceTemplatesComponent_For_76_Conditional_1_Template, 2, 0, "span", 49);
    \u0275\u0275elementStart(2, "span", 50);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 51)(5, "span", 52);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 53);
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
function InvoiceTemplatesComponent_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 27);
    \u0275\u0275text(1, "\u2713 Active");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 29);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function InvoiceTemplatesComponent_For_92_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
function InvoiceTemplatesComponent_For_99_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
function InvoiceTemplatesComponent_For_105_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
function InvoiceTemplatesComponent_For_112_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
function InvoiceTemplatesComponent_For_118_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
function InvoiceTemplatesComponent_For_124_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 33);
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
  }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 149, vars: 39, consts: [["logoInput", ""], ["title", "Invoice Templates", "subtitle", "Choose how your invoices and bills look, and add your company logo"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], [1, "info-box", 2, "margin-bottom", "20px", "display", "flex", "gap", "8px", "align-items", "flex-start"], ["name", "template", 2, "margin-top", "1px", "flex-shrink", "0", 3, "size"], [1, "it-layout"], [2, "display", "grid", "gap", "20px"], [1, "card"], [1, "card-title", 2, "margin-bottom", "4px"], [1, "card-sub", 2, "margin-bottom", "12px"], ["type", "button", 2, "width", "100%", "border", "2px dashed var(--border)", "border-radius", "10px", "padding", "20px", "text-align", "center", "background", "var(--card)", "cursor", "pointer", 3, "click"], ["type", "file", "accept", "image/*", "hidden", "", 3, "change"], ["type", "button", 1, "btn", "ghost", "sm", 2, "margin-top", "8px"], [1, "card-title", 2, "margin-bottom", "12px"], [2, "display", "flex", "align-items", "center", "gap", "10px"], ["type", "color", 2, "width", "42px", "height", "42px", "border", "1px solid var(--border)", "border-radius", "8px", "padding", "2px", "background", "var(--card)", "cursor", "pointer", "flex-shrink", "0", 3, "ngModelChange", "ngModel"], [1, "mono", 3, "ngModelChange", "ngModel"], [2, "display", "grid", "gap", "10px"], [1, "checkbox", 2, "justify-content", "space-between"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], [1, "pill", "active"], ["type", "button", 1, "theme-card", 3, "selected"], [1, "theme-current-badge", 2, "position", "static"], [1, "form"], [1, "field"], [3, "ngModelChange", "ngModel"], [3, "value"], [1, "grid", "grid-2"], [1, "hint", 2, "text-transform", "none"], [2, "position", "sticky", "top", "20px"], [1, "card-sub", 2, "margin-bottom", "10px", "display", "flex", "justify-content", "space-between", "align-items", "center"], [1, "pill"], [2, "border", "1px solid var(--border)", "border-radius", "14px", "overflow", "hidden", "box-shadow", "var(--shadow-md)"], [3, "invoice", "client", "orgName", "orgAddress", "orgGstin", "orgPan", "templateId", "customTemplate", "accentColor", "logoUrl", "showLogo", "showSignature", "showBankDetails", "showAmountInWords"], ["alt", "Logo", 2, "max-height", "40px", "max-width", "100%", "display", "block", "margin", "0 auto 8px", 3, "src"], [2, "font-size", "11px", "color", "var(--green)", "font-weight", "600", "display", "flex", "gap", "4px", "align-items", "center", "justify-content", "center"], ["name", "checkCircle", 3, "size"], [2, "color", "var(--muted)", "display", "flex", "justify-content", "center"], ["name", "upload", 3, "size", "strokeWidth"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "6px"], ["type", "button", 1, "btn", "ghost", "sm", 2, "margin-top", "8px", 3, "click"], ["type", "button", 1, "theme-card", 3, "click"], [1, "theme-current-badge"], [2, "width", "44px", "height", "36px", "border-radius", "6px", "flex-shrink", "0", "display", "grid", "place-items", "center", "font-size", "9px", "font-weight", "700", "color", "#fff"], [1, "theme-card-info"], [1, "theme-card-name"], [2, "font-size", "11px", "color", "var(--muted)"]], template: function InvoiceTemplatesComponent_Template(rf, ctx) {
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
      \u0275\u0275element(7, "app-icon", 6);
      \u0275\u0275elementStart(8, "span");
      \u0275\u0275text(9, "Pick from 10 authentic layouts, or build your own from scratch below. Add your logo and toggle what appears on the document. The preview on the right updates instantly \u2014 nothing changes for your real invoices until you hit ");
      \u0275\u0275elementStart(10, "strong");
      \u0275\u0275text(11, "Save Template");
      \u0275\u0275elementEnd();
      \u0275\u0275text(12, ".");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(13, "div", 7)(14, "div", 8)(15, "section", 9)(16, "div", 10);
      \u0275\u0275text(17, "Company Logo");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "div", 11);
      \u0275\u0275text(19, "Shown in your sidebar and on every invoice header");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "button", 12);
      \u0275\u0275listener("click", function InvoiceTemplatesComponent_Template_button_click_20_listener() {
        \u0275\u0275restoreView(_r1);
        const logoInput_r2 = \u0275\u0275reference(24);
        return \u0275\u0275resetView(logoInput_r2.click());
      });
      \u0275\u0275template(21, InvoiceTemplatesComponent_Conditional_21_Template, 4, 2)(22, InvoiceTemplatesComponent_Conditional_22_Template, 4, 2);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "input", 13, 0);
      \u0275\u0275listener("change", function InvoiceTemplatesComponent_Template_input_change_23_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onLogoFile($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(25, InvoiceTemplatesComponent_Conditional_25_Template, 2, 0, "button", 14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "section", 9)(27, "div", 15);
      \u0275\u0275text(28, "Accent Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "div", 16)(30, "input", 17);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_30_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.accentColor.set($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "input", 18);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_31_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.accentColor.set($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(32, "section", 9)(33, "div", 15);
      \u0275\u0275text(34, "Invoice Content");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(35, "div", 19)(36, "label", 20)(37, "span");
      \u0275\u0275text(38, "Company logo");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "span", 21)(40, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_40_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showLogo", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(41, "span", 23);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(42, "label", 20)(43, "span");
      \u0275\u0275text(44, "Authorised signature");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "span", 21)(46, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_46_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showSignature", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(47, "span", 23);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(48, "label", 20)(49, "span");
      \u0275\u0275text(50, "Bank details section");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "span", 21)(52, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_52_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showBankDetails", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(53, "span", 23);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(54, "label", 20)(55, "span");
      \u0275\u0275text(56, "Amount in words");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(57, "span", 21)(58, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_58_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showAmountInWords", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(59, "span", 23);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(60, "label", 20)(61, "span");
      \u0275\u0275text(62, "GST rate breakdown");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "span", 21)(64, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_64_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setContent("showGstBreakdown", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(65, "span", 23);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(66, "section", 9)(67, "div", 24)(68, "div")(69, "div", 25);
      \u0275\u0275text(70, "Choose a Template");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(71, "div", 26);
      \u0275\u0275text(72, "10 authentic layouts \u2014 click to preview instantly");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(73, InvoiceTemplatesComponent_Conditional_73_Template, 2, 0, "span", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(74, "div", 19);
      \u0275\u0275repeaterCreate(75, InvoiceTemplatesComponent_For_76_Template, 9, 8, "button", 28, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(77, "section", 9)(78, "div", 24)(79, "div")(80, "div", 25);
      \u0275\u0275text(81, "Custom Template");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(82, "div", 26);
      \u0275\u0275text(83, "Build your own layout \u2014 editing any field switches the preview to your custom build");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(84, InvoiceTemplatesComponent_Conditional_84_Template, 2, 0, "span", 27)(85, InvoiceTemplatesComponent_Conditional_85_Template, 2, 0, "span", 29);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(86, "div", 30)(87, "div", 31)(88, "label");
      \u0275\u0275text(89, "Font");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(90, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_90_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("font", $event));
      });
      \u0275\u0275repeaterCreate(91, InvoiceTemplatesComponent_For_92_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(93, "div", 34)(94, "div", 31)(95, "label");
      \u0275\u0275text(96, "Header Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(97, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_97_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("headerStyle", $event));
      });
      \u0275\u0275repeaterCreate(98, InvoiceTemplatesComponent_For_99_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(100, "div", 31)(101, "label");
      \u0275\u0275text(102, "Title Alignment");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(103, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_103_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("titleAlign", $event));
      });
      \u0275\u0275repeaterCreate(104, InvoiceTemplatesComponent_For_105_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(106, "div", 34)(107, "div", 31)(108, "label");
      \u0275\u0275text(109, "Table Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(110, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_110_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("tableStyle", $event));
      });
      \u0275\u0275repeaterCreate(111, InvoiceTemplatesComponent_For_112_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(113, "div", 31)(114, "label");
      \u0275\u0275text(115, "Divider Style");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(116, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_116_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("dividerStyle", $event));
      });
      \u0275\u0275repeaterCreate(117, InvoiceTemplatesComponent_For_118_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(119, "div", 31)(120, "label");
      \u0275\u0275text(121, "Paper Tone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(122, "select", 32);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_select_ngModelChange_122_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("paperTone", $event));
      });
      \u0275\u0275repeaterCreate(123, InvoiceTemplatesComponent_For_124_Template, 2, 2, "option", 33, _forTrack1);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(125, "label", 20)(126, "span");
      \u0275\u0275text(127, "Compact rows ");
      \u0275\u0275elementStart(128, "span", 35);
      \u0275\u0275text(129, "\u2014 tighter spacing for invoices with many line items");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(130, "span", 21)(131, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_131_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("compact", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(132, "span", 23);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(133, "label", 20)(134, "span");
      \u0275\u0275text(135, "Narrow margins ");
      \u0275\u0275elementStart(136, "span", 35);
      \u0275\u0275text(137, "\u2014 receipt-style content width");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(138, "span", 21)(139, "input", 22);
      \u0275\u0275listener("ngModelChange", function InvoiceTemplatesComponent_Template_input_ngModelChange_139_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.setCustom("narrow", $event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275element(140, "span", 23);
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementStart(141, "div", 36)(142, "div", 37)(143, "span");
      \u0275\u0275text(144, "Live Preview \u2014 sample invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(145, "span", 38);
      \u0275\u0275text(146);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(147, "div", 39);
      \u0275\u0275element(148, "app-invoice-document", 40);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_35_0;
      let tmp_36_0;
      let tmp_37_0;
      let tmp_38_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.dirty());
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.dirty() || ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 4 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(14);
      \u0275\u0275conditional(ctx.logoUrl() ? 21 : 22);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.logoUrl() ? 25 : -1);
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
      \u0275\u0275conditional(ctx.mode() === "preset" ? 73 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.templates);
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.mode() === "custom" ? 84 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.savedMode() === "custom" ? 85 : -1);
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
      \u0275\u0275property("invoice", ctx.sampleInvoice)("client", ctx.sampleClient)("orgName", ((tmp_35_0 = ctx.auth.organisation()) == null ? null : tmp_35_0.name) || "Your Business")("orgAddress", ((tmp_36_0 = ctx.auth.organisation()) == null ? null : tmp_36_0.address) || "")("orgGstin", ((tmp_37_0 = ctx.auth.organisation()) == null ? null : tmp_37_0.gstin) || "")("orgPan", ((tmp_38_0 = ctx.auth.organisation()) == null ? null : tmp_38_0.pan) || "")("templateId", ctx.effectiveTemplateId())("customTemplate", ctx.customTemplate())("accentColor", ctx.accentColor())("logoUrl", ctx.content().showLogo ? ctx.logoUrl() : "")("showLogo", ctx.content().showLogo)("showSignature", ctx.content().showSignature)("showBankDetails", ctx.content().showBankDetails)("showAmountInWords", ctx.content().showAmountInWords);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, AppShellComponent, InvoiceDocumentComponent, IconComponent], styles: ["\n\n.it-layout[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: minmax(320px, 380px) 1fr;\n  gap: 24px;\n  align-items: start;\n}\n@media (max-width: 880px) {\n  .it-layout[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n/*# sourceMappingURL=invoice-templates.component.css.map */"] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoiceTemplatesComponent, { className: "InvoiceTemplatesComponent", filePath: "src\\app\\features\\invoice-templates\\invoice-templates.component.ts", lineNumber: 240 });
})();
export {
  InvoiceTemplatesComponent
};
//# sourceMappingURL=chunk-6IIBGG72.js.map
