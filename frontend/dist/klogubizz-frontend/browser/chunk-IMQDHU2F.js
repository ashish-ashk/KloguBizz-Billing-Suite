import {
  InvoiceDocumentComponent
} from "./chunk-GHI6Y4GD.js";
import {
  ToastService,
  ToastsComponent
} from "./chunk-OBVHAWX5.js";
import {
  downloadBlob
} from "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import "./chunk-XAFCZYPI.js";
import {
  ActivatedRoute,
  AuthService,
  RouterLink
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
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
  ɵɵpureFunction1,
  ɵɵtemplate,
  ɵɵtext
} from "./chunk-6VNHH65J.js";

// src/app/features/invoices/invoice-print.component.ts
var _c0 = (a0) => ["/invoices", a0, "edit"];
function InvoicePrintComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 7);
  }
}
function InvoicePrintComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 9);
    \u0275\u0275element(1, "app-invoice-document", 11);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    let tmp_5_0;
    let tmp_6_0;
    let tmp_7_0;
    let tmp_8_0;
    let tmp_9_0;
    let tmp_10_0;
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_15_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("invoice", ctx)("client", ctx_r0.client())("orgName", ((tmp_4_0 = ctx_r0.org()) == null ? null : tmp_4_0.name) || "Your Business")("orgAddress", ((tmp_5_0 = ctx_r0.org()) == null ? null : tmp_5_0.address) || "")("orgGstin", ((tmp_6_0 = ctx_r0.org()) == null ? null : tmp_6_0.gstin) || "")("orgPan", ((tmp_7_0 = ctx_r0.org()) == null ? null : tmp_7_0.pan) || "")("templateId", ((tmp_8_0 = ctx_r0.org()) == null ? null : tmp_8_0.brandingConfig == null ? null : tmp_8_0.brandingConfig.invoiceTemplateId) || "classic-corporate")("customTemplate", ((tmp_9_0 = ctx_r0.org()) == null ? null : tmp_9_0.brandingConfig == null ? null : tmp_9_0.brandingConfig.customInvoiceTemplate) || null)("accentColor", ((tmp_10_0 = ctx_r0.org()) == null ? null : tmp_10_0.brandingConfig == null ? null : tmp_10_0.brandingConfig.primaryColor) || "#4f46e5")("logoUrl", ((tmp_11_0 = ctx_r0.org()) == null ? null : tmp_11_0.brandingConfig == null ? null : tmp_11_0.brandingConfig.logoUrl) || "")("showLogo", ((tmp_12_0 = ctx_r0.org()) == null ? null : tmp_12_0.brandingConfig == null ? null : tmp_12_0.brandingConfig.invoiceContent == null ? null : tmp_12_0.brandingConfig.invoiceContent.showLogo) !== false)("showSignature", ((tmp_13_0 = ctx_r0.org()) == null ? null : tmp_13_0.brandingConfig == null ? null : tmp_13_0.brandingConfig.invoiceContent == null ? null : tmp_13_0.brandingConfig.invoiceContent.showSignature) !== false)("showBankDetails", ((tmp_14_0 = ctx_r0.org()) == null ? null : tmp_14_0.brandingConfig == null ? null : tmp_14_0.brandingConfig.invoiceContent == null ? null : tmp_14_0.brandingConfig.invoiceContent.showBankDetails) !== false)("showAmountInWords", ((tmp_15_0 = ctx_r0.org()) == null ? null : tmp_15_0.brandingConfig == null ? null : tmp_15_0.brandingConfig.invoiceContent == null ? null : tmp_15_0.brandingConfig.invoiceContent.showAmountInWords) !== false);
  }
}
function InvoicePrintComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10)(1, "p", 12);
    \u0275\u0275text(2, "Invoice not found.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "a", 13);
    \u0275\u0275text(4, "Back to invoices");
    \u0275\u0275elementEnd()();
  }
}
var InvoicePrintComponent = class _InvoicePrintComponent {
  api;
  auth;
  toast;
  route;
  invoiceId = "";
  invoice = signal(null);
  loading = signal(true);
  downloading = signal(false);
  constructor(api, auth, toast, route) {
    this.api = api;
    this.auth = auth;
    this.toast = toast;
    this.route = route;
  }
  org() {
    return this.auth.organisation();
  }
  client() {
    const inv = this.invoice();
    if (!inv || typeof inv.clientId === "string")
      return null;
    return inv.clientId;
  }
  ngOnInit() {
    this.invoiceId = this.route.snapshot.paramMap.get("id") || "";
    this.api.invoice(this.invoiceId).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Invoice not found.");
      }
    });
  }
  print() {
    window.print();
  }
  downloadPdf() {
    this.downloading.set(true);
    this.api.downloadInvoicePdf(this.invoiceId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        downloadBlob(blob, `${this.invoice()?.invoiceNumber || "invoice"}.pdf`);
      },
      error: (err) => {
        this.downloading.set(false);
        this.toast.httpError(err, "Could not generate the PDF.");
      }
    });
  }
  static \u0275fac = function InvoicePrintComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoicePrintComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(ActivatedRoute));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoicePrintComponent, selectors: [["app-invoice-print"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 15, vars: 8, consts: [[2, "min-height", "100vh", "background", "var(--bg)", "padding", "28px 20px"], [1, "no-print", 2, "max-width", "860px", "margin", "0 auto 18px", "display", "flex", "justify-content", "space-between", "gap", "10px", "flex-wrap", "wrap"], [1, "btn", "secondary", 3, "routerLink"], [2, "display", "flex", "gap", "10px"], ["type", "button", 1, "btn", "secondary", 3, "click"], ["name", "printer", 3, "size"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["name", "download", 3, "size"], ["id", "print-area"], [1, "card", 2, "max-width", "520px", "margin", "60px auto", "text-align", "center"], [3, "invoice", "client", "orgName", "orgAddress", "orgGstin", "orgPan", "templateId", "customTemplate", "accentColor", "logoUrl", "showLogo", "showSignature", "showBankDetails", "showAmountInWords"], [2, "color", "var(--muted)"], ["routerLink", "/invoices", 1, "btn", "primary"]], template: function InvoicePrintComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "a", 2);
      \u0275\u0275text(3, "\u2190 Back to editor");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "div", 3)(5, "button", 4);
      \u0275\u0275listener("click", function InvoicePrintComponent_Template_button_click_5_listener() {
        return ctx.print();
      });
      \u0275\u0275element(6, "app-icon", 5);
      \u0275\u0275text(7, " Print");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "button", 6);
      \u0275\u0275listener("click", function InvoicePrintComponent_Template_button_click_8_listener() {
        return ctx.downloadPdf();
      });
      \u0275\u0275template(9, InvoicePrintComponent_Conditional_9_Template, 1, 0, "span", 7);
      \u0275\u0275element(10, "app-icon", 8);
      \u0275\u0275text(11, " Download PDF ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(12, InvoicePrintComponent_Conditional_12_Template, 2, 14, "div", 9)(13, InvoicePrintComponent_Conditional_13_Template, 5, 0, "div", 10);
      \u0275\u0275elementEnd();
      \u0275\u0275element(14, "app-toasts");
    }
    if (rf & 2) {
      let tmp_5_0;
      \u0275\u0275advance(2);
      \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(6, _c0, ctx.invoiceId));
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.downloading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.downloading() ? 9 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275conditional((tmp_5_0 = ctx.invoice()) ? 12 : !ctx.loading() ? 13 : -1, tmp_5_0);
    }
  }, dependencies: [CommonModule, RouterLink, IconComponent, ToastsComponent, InvoiceDocumentComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoicePrintComponent, { className: "InvoicePrintComponent", filePath: "src\\app\\features\\invoices\\invoice-print.component.ts", lineNumber: 57 });
})();
export {
  InvoicePrintComponent
};
//# sourceMappingURL=chunk-IMQDHU2F.js.map
