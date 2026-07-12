import {
  fmtDate,
  fmtINR,
  numberToWords,
  stateName
} from "./chunk-ECR3SCST.js";
import {
  CommonModule,
  __spreadValues,
  computed,
  input,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtextInterpolate3
} from "./chunk-KLA3EWNB.js";

// src/app/core/invoice-templates.ts
var FONT_STACKS = {
  "Times-Roman": '"Times New Roman", Times, serif',
  "Times-Bold": '"Times New Roman", Times, serif',
  "Helvetica": "Arial, Helvetica, sans-serif",
  "Helvetica-Bold": "Arial, Helvetica, sans-serif",
  "Courier": '"Courier New", Courier, monospace',
  "Courier-Bold": '"Courier New", Courier, monospace'
};
var PAPER_TONE_COLORS = {
  white: "#ffffff",
  cream: "#fdfaf3",
  graypaper: "#f7f7f5"
};
var INVOICE_TEMPLATES = [
  { id: "classic-corporate", name: "Classic Corporate", description: "Formal serif layout with a bordered header band \u2014 the traditional look accountants expect.", font: "Times-Roman", headerStyle: "band", titleAlign: "right", tableStyle: "bordered", dividerStyle: "double", paperTone: "white" },
  { id: "modern-minimal", name: "Modern Minimal", description: "Clean sans-serif with generous white space and no visual clutter.", font: "Helvetica", headerStyle: "plain", titleAlign: "left", tableStyle: "minimal", dividerStyle: "solid", paperTone: "white" },
  { id: "bold-header", name: "Bold Header", description: "Full-width color band up top with a large title \u2014 impossible to miss in an inbox.", font: "Helvetica", headerStyle: "bandLarge", titleAlign: "center", tableStyle: "zebra", dividerStyle: "none", paperTone: "white" },
  { id: "elegant-serif", name: "Elegant Serif", description: "Warm cream paper tone with italic accents and a boxed table \u2014 boutique and refined.", font: "Times-Roman", headerStyle: "centered", titleAlign: "center", tableStyle: "boxed", dividerStyle: "dotted", paperTone: "cream" },
  { id: "two-column-compact", name: "Two-Column Compact", description: "Dense, information-first layout that fits many line items without feeling cramped.", font: "Helvetica", headerStyle: "split", titleAlign: "left", tableStyle: "minimal", dividerStyle: "solid", paperTone: "white", compact: true },
  { id: "tech-startup", name: "Tech Startup", description: "A bold color bar down the side and confident type \u2014 built for product-led companies.", font: "Helvetica-Bold", headerStyle: "sidebar", titleAlign: "left", tableStyle: "zebra", dividerStyle: "none", paperTone: "white" },
  { id: "gradient-accent", name: "Gradient Accent", description: "Layered two-tone header band for a modern, design-forward first impression.", font: "Helvetica", headerStyle: "gradient", titleAlign: "center", tableStyle: "bordered", dividerStyle: "solid", paperTone: "white" },
  { id: "professional-blue", name: "Professional Blue", description: "Boxed sections and a steady grid \u2014 the reassuring look of an enterprise invoice.", font: "Helvetica", headerStyle: "boxed", titleAlign: "right", tableStyle: "boxed", dividerStyle: "solid", paperTone: "white" },
  { id: "creative-bold", name: "Creative Bold", description: "An angled color block and confident negative space for agencies and studios.", font: "Helvetica-Bold", headerStyle: "diagonal", titleAlign: "right", tableStyle: "zebra", dividerStyle: "none", paperTone: "white" },
  { id: "simple-receipt", name: "Simple Receipt", description: "Monospace, centered, narrow \u2014 reads like a point-of-sale receipt.", font: "Courier", headerStyle: "centered", titleAlign: "center", tableStyle: "minimal", dividerStyle: "dotted", paperTone: "white", narrow: true }
];
function getInvoiceTemplate(id) {
  return INVOICE_TEMPLATES.find((t) => t.id === id) || INVOICE_TEMPLATES[0];
}
var CUSTOM_TEMPLATE_ID = "custom";
var DEFAULT_CUSTOM_INVOICE_TEMPLATE = {
  font: "Helvetica",
  headerStyle: "plain",
  titleAlign: "right",
  tableStyle: "bordered",
  dividerStyle: "solid",
  paperTone: "white",
  compact: false,
  narrow: false
};
var FONT_OPTIONS = [
  { value: "Helvetica", label: "Sans-serif (Helvetica)" },
  { value: "Helvetica-Bold", label: "Sans-serif Bold (Helvetica)" },
  { value: "Times-Roman", label: "Serif (Times)" },
  { value: "Courier", label: "Monospace (Courier)" }
];
var HEADER_STYLE_OPTIONS = [
  { value: "plain", label: "Plain \u2014 logo left, title right" },
  { value: "band", label: "Band \u2014 colored strip across the top" },
  { value: "bandLarge", label: "Large Band \u2014 big centered title" },
  { value: "centered", label: "Centered \u2014 everything center-aligned" },
  { value: "split", label: "Split \u2014 two even columns" },
  { value: "sidebar", label: "Sidebar \u2014 colored vertical bar" },
  { value: "gradient", label: "Gradient \u2014 layered two-tone band" },
  { value: "boxed", label: "Boxed \u2014 bordered info panels" },
  { value: "diagonal", label: "Diagonal \u2014 angled color block" }
];
var TITLE_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" }
];
var TABLE_STYLE_OPTIONS = [
  { value: "bordered", label: "Bordered \u2014 grid lines around every cell" },
  { value: "zebra", label: "Zebra \u2014 alternating row shading" },
  { value: "minimal", label: "Minimal \u2014 no borders, just a header rule" },
  { value: "boxed", label: "Boxed \u2014 accent-colored header row" }
];
var DIVIDER_STYLE_OPTIONS = [
  { value: "solid", label: "Solid line" },
  { value: "double", label: "Double line" },
  { value: "dotted", label: "Dotted line" },
  { value: "none", label: "None" }
];
var PAPER_TONE_OPTIONS = [
  { value: "white", label: "White" },
  { value: "cream", label: "Cream" },
  { value: "graypaper", label: "Soft Gray" }
];
function resolveInvoiceTemplate(templateId, customTemplate) {
  if (templateId === CUSTOM_TEMPLATE_ID && customTemplate) {
    return __spreadValues({ id: CUSTOM_TEMPLATE_ID, name: "Custom Template", description: "Your own template" }, customTemplate);
  }
  return getInvoiceTemplate(templateId);
}

// src/app/shared/invoice-document.component.ts
var _c0 = () => ["#", "Description", "HSN/SAC", "Qty", "Rate", "GST %", "Tax Amt", "Total"];
function InvoiceDocumentComponent_Case_1_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 36);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_1_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 35);
    \u0275\u0275template(2, InvoiceDocumentComponent_Case_1_Conditional_2_Template, 1, 1, "img", 36);
    \u0275\u0275elementStart(3, "div")(4, "div", 37);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, InvoiceDocumentComponent_Case_1_Conditional_6_Template, 2, 1, "div", 38);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 39);
    \u0275\u0275text(8, "TAX INVOICE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 40)(10, "span", 25);
    \u0275\u0275text(11, "Invoice #: ");
    \u0275\u0275elementStart(12, "strong");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "span", 41);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 2 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 6 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.invoice().invoiceNumber);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due: ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_2_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 43);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275template(1, InvoiceDocumentComponent_Case_2_Conditional_1_Template, 1, 1, "img", 43);
    \u0275\u0275elementStart(2, "div", 44);
    \u0275\u0275text(3, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 45);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 1 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate3("", ctx_r0.orgName(), " \xB7 ", ctx_r0.invoice().invoiceNumber, " \xB7 Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_3_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 49);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46);
    \u0275\u0275element(1, "div", 47);
    \u0275\u0275elementStart(2, "div", 48);
    \u0275\u0275template(3, InvoiceDocumentComponent_Case_3_Conditional_3_Template, 1, 1, "img", 49);
    \u0275\u0275elementStart(4, "div", 50);
    \u0275\u0275text(5, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 51);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 52);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 3 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate2("", ctx_r0.orgName(), " \xB7 ", ctx_r0.invoice().invoiceNumber, "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_4_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 54);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_4_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 56);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3)(1, "div", 53);
    \u0275\u0275template(2, InvoiceDocumentComponent_Case_4_Conditional_2_Template, 1, 1, "img", 54);
    \u0275\u0275elementStart(3, "div")(4, "div", 55);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, InvoiceDocumentComponent_Case_4_Conditional_6_Template, 2, 1, "div", 56);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 57)(8, "div", 55);
    \u0275\u0275text(9, "INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 58);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 59);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.invoice().invoiceNumber);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_5_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 63);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_5_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 64);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "div", 60);
    \u0275\u0275elementStart(2, "div", 61)(3, "div", 62);
    \u0275\u0275template(4, InvoiceDocumentComponent_Case_5_Conditional_4_Template, 1, 1, "img", 63);
    \u0275\u0275elementStart(5, "div")(6, "div", 29);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275template(8, InvoiceDocumentComponent_Case_5_Conditional_8_Template, 2, 1, "div", 64);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 15)(10, "div", 65);
    \u0275\u0275text(11, "INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 66);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 67);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 4 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 8 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.invoice().invoiceNumber);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_6_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 69);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_6_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("GSTIN: ", ctx_r0.orgGstin(), "");
  }
}
function InvoiceDocumentComponent_Case_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5)(1, "div", 68);
    \u0275\u0275template(2, InvoiceDocumentComponent_Case_6_Conditional_2_Template, 1, 1, "img", 69);
    \u0275\u0275elementStart(3, "div")(4, "div", 70);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, InvoiceDocumentComponent_Case_6_Conditional_6_Template, 2, 1, "div", 71);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 15)(8, "div", 72);
    \u0275\u0275text(9, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 73);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 74);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgGstin() ? 6 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("", ctx_r0.invoice().invoiceNumber, " \xB7 ", ctx_r0.fmtDate(ctx_r0.invoice().date), "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_7_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 76);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_7_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5)(1, "div", 75);
    \u0275\u0275template(2, InvoiceDocumentComponent_Case_7_Conditional_2_Template, 1, 1, "img", 76);
    \u0275\u0275elementStart(3, "div")(4, "div", 77);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, InvoiceDocumentComponent_Case_7_Conditional_6_Template, 2, 1, "div", 71);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 78)(8, "div", 70);
    \u0275\u0275text(9, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 73);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 74);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("border", "1px solid " + ctx_r0.accentColor());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("border", "1px solid " + ctx_r0.accentColor());
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.invoice().invoiceNumber);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_8_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 43);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_8_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275template(1, InvoiceDocumentComponent_Case_8_Conditional_1_Template, 1, 1, "img", 43);
    \u0275\u0275elementStart(2, "div", 29);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, InvoiceDocumentComponent_Case_8_Conditional_4_Template, 2, 1, "div", 79);
    \u0275\u0275elementStart(5, "div", 80);
    \u0275\u0275text(6, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 66);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate3("", ctx_r0.invoice().invoiceNumber, " \xB7 ", ctx_r0.fmtDate(ctx_r0.invoice().date), " \xB7 Due ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_9_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 82);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r0.logoUrl(), \u0275\u0275sanitizeUrl);
  }
}
function InvoiceDocumentComponent_Case_9_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgAddress());
  }
}
function InvoiceDocumentComponent_Case_9_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " GSTIN: ");
    \u0275\u0275elementStart(1, "span", 85);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.orgGstin());
  }
}
function InvoiceDocumentComponent_Case_9_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \xA0|\xA0 PAN: ");
    \u0275\u0275elementStart(1, "span", 85);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.orgPan());
  }
}
function InvoiceDocumentComponent_Case_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 7)(1, "div", 81);
    \u0275\u0275template(2, InvoiceDocumentComponent_Case_9_Conditional_2_Template, 1, 1, "img", 82);
    \u0275\u0275elementStart(3, "div")(4, "div", 83);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 84);
    \u0275\u0275template(7, InvoiceDocumentComponent_Case_9_Conditional_7_Template, 2, 1, "div");
    \u0275\u0275elementStart(8, "div");
    \u0275\u0275template(9, InvoiceDocumentComponent_Case_9_Conditional_9_Template, 3, 1, "span", 85)(10, InvoiceDocumentComponent_Case_9_Conditional_10_Template, 3, 1, "span", 85);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(11, "div", 15)(12, "div", 86);
    \u0275\u0275text(13, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 87);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 88);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 89);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.showLogo() && ctx_r0.logoUrl() ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName() || "Your Business");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.orgAddress() ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.orgGstin() ? 9 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.orgPan() ? 10 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.invoice().invoiceNumber);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Invoice date: ", ctx_r0.fmtDate(ctx_r0.invoice().date), "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Due date: ", ctx_r0.fmtDate(ctx_r0.invoice().dueDate), "");
  }
}
function InvoiceDocumentComponent_Case_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 90)(1, "div", 91);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
  }
}
function InvoiceDocumentComponent_Case_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 92);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("border-top", "2px dotted " + ctx_r0.accentColor());
  }
}
function InvoiceDocumentComponent_Case_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 9);
  }
}
function InvoiceDocumentComponent_Case_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 93);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.accentColor());
  }
}
function InvoiceDocumentComponent_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate((tmp_1_0 = ctx_r0.client()) == null ? null : tmp_1_0.address);
  }
}
function InvoiceDocumentComponent_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1, "GSTIN: ");
    \u0275\u0275elementStart(2, "span", 85);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_1_0 = ctx_r0.client()) == null ? null : tmp_1_0.gstin);
  }
}
function InvoiceDocumentComponent_For_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "th", 94);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const h_r2 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("color", ctx_r0.tpl().tableStyle === "minimal" ? "var(--muted)" : "#fff")("text-align", h_r2 === "#" || h_r2 === "Description" || h_r2 === "HSN/SAC" ? "left" : "right");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(h_r2);
  }
}
function InvoiceDocumentComponent_For_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr", 95)(1, "td", 96);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 97);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 98);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 99);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td", 99);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td", 99);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td", 100);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 101);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    const \u0275$index_316_r4 = ctx.$index;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.rowBg(\u0275$index_316_r4))("border", ctx_r0.tpl().tableStyle === "bordered" || ctx_r0.tpl().tableStyle === "boxed" ? "1px solid #e5e7eb" : "none");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275$index_316_r4 + 1);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(item_r3.desc);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r3.hsn || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r3.qty);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(item_r3.rate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", item_r3.gstRate, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.itemTax(item_r3)));
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.itemTotal(item_r3)));
  }
}
function InvoiceDocumentComponent_Conditional_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div")(1, "div", 102);
    \u0275\u0275text(2, "Notes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 103);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.invoice().notes);
  }
}
function InvoiceDocumentComponent_Conditional_48_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("Bank: ", (tmp_2_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_2_0.bank, "");
  }
}
function InvoiceDocumentComponent_Conditional_48_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1, "A/c: ");
    \u0275\u0275elementStart(2, "span", 85);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_2_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_2_0.account);
  }
}
function InvoiceDocumentComponent_Conditional_48_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1, "IFSC: ");
    \u0275\u0275elementStart(2, "span", 85);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_2_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_2_0.ifsc);
  }
}
function InvoiceDocumentComponent_Conditional_48_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 104)(1, "div", 105);
    \u0275\u0275text(2, "Bank Details");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 106);
    \u0275\u0275template(4, InvoiceDocumentComponent_Conditional_48_Conditional_4_Template, 2, 1, "div")(5, InvoiceDocumentComponent_Conditional_48_Conditional_5_Template, 4, 1, "div")(6, InvoiceDocumentComponent_Conditional_48_Conditional_6_Template, 4, 1, "div");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    let tmp_3_0;
    let tmp_4_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r0.panelBg());
    \u0275\u0275advance(4);
    \u0275\u0275conditional(((tmp_2_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_2_0.bank) ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(((tmp_3_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_3_0.account) ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(((tmp_4_0 = ctx_r0.invoice().bankDetails) == null ? null : tmp_4_0.ifsc) ? 6 : -1);
  }
}
function InvoiceDocumentComponent_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "span", 25);
    \u0275\u0275text(2, "IGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 26);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.invoice().totals.igst));
  }
}
function InvoiceDocumentComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "span", 25);
    \u0275\u0275text(2, "CGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 26);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 24)(6, "span", 25);
    \u0275\u0275text(7, "SGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 26);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.invoice().totals.cgst));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.invoice().totals.sgst));
  }
}
function InvoiceDocumentComponent_Conditional_63_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 107)(1, "strong");
    \u0275\u0275text(2, "Amount in words:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("color", ctx_r0.accentColor());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r0.numberToWords(ctx_r0.invoice().totals.total), " ");
  }
}
function InvoiceDocumentComponent_Conditional_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 33)(1, "div", 108);
    \u0275\u0275text(2, "Authorised Signatory");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 109);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.accentColor())("border-color", ctx_r0.accentColor());
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r0.dark);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.orgName());
  }
}
var InvoiceDocumentComponent = class _InvoiceDocumentComponent {
  invoice = input.required();
  client = input(null);
  orgName = input("Your Business");
  orgAddress = input("");
  orgGstin = input("");
  orgPan = input("");
  templateId = input("classic-corporate");
  customTemplate = input(null);
  accentColor = input("#4f46e5");
  logoUrl = input("");
  showLogo = input(true);
  showSignature = input(true);
  showBankDetails = input(true);
  showAmountInWords = input(true);
  dark = "#1e1b4b";
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  numberToWords = numberToWords;
  stateName = stateName;
  tpl = computed(() => resolveInvoiceTemplate(this.templateId(), this.customTemplate()));
  fontStack = computed(() => FONT_STACKS[this.tpl().font] || "Arial, sans-serif");
  paperBg = computed(() => PAPER_TONE_COLORS[this.tpl().paperTone] || "#ffffff");
  panelBg = computed(() => this.tpl().paperTone === "cream" ? "#f6efe0" : "#f5f6ff");
  rowBg(i) {
    if (this.tpl().tableStyle === "zebra")
      return i % 2 ? "#fafbff" : "#fff";
    return i % 2 && this.tpl().tableStyle !== "minimal" ? "#fafbff" : "transparent";
  }
  itemTax(item) {
    return item.qty * item.rate * item.gstRate / 100;
  }
  itemTotal(item) {
    return item.qty * item.rate + this.itemTax(item);
  }
  static \u0275fac = function InvoiceDocumentComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoiceDocumentComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoiceDocumentComponent, selectors: [["app-invoice-document"]], inputs: { invoice: [1, "invoice"], client: [1, "client"], orgName: [1, "orgName"], orgAddress: [1, "orgAddress"], orgGstin: [1, "orgGstin"], orgPan: [1, "orgPan"], templateId: [1, "templateId"], customTemplate: [1, "customTemplate"], accentColor: [1, "accentColor"], logoUrl: [1, "logoUrl"], showLogo: [1, "showLogo"], showSignature: [1, "showSignature"], showBankDetails: [1, "showBankDetails"], showAmountInWords: [1, "showAmountInWords"] }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 68, vars: 40, consts: [[1, "invoice-doc"], [2, "border-radius", "10px 10px 0 0", "padding", "26px 22px", "text-align", "center", 3, "background"], [2, "position", "relative", "border-radius", "10px 10px 0 0", "padding", "22px", "text-align", "center", "overflow", "hidden", 3, "background"], [2, "position", "relative", "display", "flex", "justify-content", "space-between", "align-items", "flex-start", "padding", "8px 4px 14px", "overflow", "hidden"], [2, "display", "flex", "gap", "18px", "padding-bottom", "10px"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "16px"], [2, "text-align", "center", "padding-bottom", "6px"], [2, "display", "flex", "justify-content", "space-between", "gap", "24px", "flex-wrap", "wrap"], [2, "margin", "22px 0", 3, "borderTop"], [2, "margin-bottom", "18px"], [2, "height", "3px", "border-radius", "4px", "margin", "22px 0 28px", 3, "background"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "20px", "padding", "18px 20px", "border-radius", "10px"], [2, "font-size", "10px", "color", "var(--faint)", "text-transform", "uppercase", "letter-spacing", "1px", "font-weight", "700"], [2, "font-size", "15px", "font-weight", "700", "margin-top", "6px"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.7", "margin-top", "4px"], [2, "text-align", "right"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.9", "margin-top", "6px"], [2, "width", "100%", "border-collapse", "collapse", "margin-top", "26px"], [2, "padding", "11px 12px", "font-size", "11px", 3, "color", "textAlign"], [2, "border-bottom", "1px solid #e0e7ff", 3, "background", "border"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "20px", "margin-top", "26px"], [2, "display", "grid", "gap", "14px", "align-content", "start"], [2, "border-radius", "10px", "padding", "14px", 3, "background"], [2, "border-radius", "10px", "padding", "16px 18px", "display", "grid", "gap", "8px", "font-size", "13px"], [2, "display", "flex", "justify-content", "space-between"], [2, "color", "var(--muted)"], [2, "font-weight", "600"], [2, "display", "flex", "justify-content", "space-between", "padding-top", "10px", "margin-top", "2px"], [2, "font-weight", "700"], [2, "font-weight", "800", "font-size", "17px"], [2, "font-size", "12px", "background", "#eef2ff", "border-radius", "8px", "padding", "10px 12px", "margin-top", "10px", "line-height", "1.6", 3, "color"], [2, "display", "flex", "justify-content", "space-between", "align-items", "flex-end", "margin-top", "40px", "gap", "20px"], [2, "font-size", "11px", "color", "var(--faint)"], [2, "text-align", "center"], [2, "border-radius", "10px 10px 0 0", "padding", "18px 22px", "display", "flex", "justify-content", "space-between", "align-items", "center", "gap", "16px", "flex-wrap", "wrap"], [2, "display", "flex", "align-items", "center", "gap", "12px"], [2, "height", "40px", "max-width", "120px", "object-fit", "contain", 3, "src"], [2, "color", "#fff", "font-weight", "800", "font-size", "15px"], [2, "color", "rgba(255,255,255,.8)", "font-size", "10.5px", "margin-top", "2px"], [2, "color", "#fff", "font-weight", "800", "font-size", "20px", "letter-spacing", "-0.4px"], [2, "display", "flex", "justify-content", "flex-end", "gap", "18px", "padding", "10px 4px", "font-size", "11px"], [2, "color", "var(--red)", "font-weight", "600"], [2, "border-radius", "10px 10px 0 0", "padding", "26px 22px", "text-align", "center"], [2, "height", "36px", "max-width", "120px", "object-fit", "contain", "margin-bottom", "8px", 3, "src"], [2, "color", "#fff", "font-weight", "800", "font-size", "26px", "letter-spacing", "-0.5px"], [2, "color", "rgba(255,255,255,.85)", "font-size", "12px", "margin-top", "6px"], [2, "position", "relative", "border-radius", "10px 10px 0 0", "padding", "22px", "text-align", "center", "overflow", "hidden"], [2, "position", "absolute", "inset", "0", "left", "35%", "background", "rgba(0,0,0,0.22)"], [2, "position", "relative"], [2, "height", "34px", "max-width", "110px", "object-fit", "contain", "margin-bottom", "6px", 3, "src"], [2, "color", "#fff", "font-weight", "800", "font-size", "20px"], [2, "color", "rgba(255,255,255,.9)", "font-size", "11.5px", "margin-top", "4px"], [2, "color", "rgba(255,255,255,.85)", "font-size", "10.5px", "margin-top", "2px"], [2, "display", "flex", "gap", "12px", "align-items", "center", "max-width", "55%"], [2, "height", "32px", "max-width", "100px", "object-fit", "contain", 3, "src"], [2, "font-weight", "800", "font-size", "16px"], [2, "font-size", "10.5px", "color", "var(--muted)", "margin-top", "2px"], [2, "clip-path", "polygon(30% 0,100% 0,100% 100%,55% 100%)", "padding", "12px 24px 12px 40px", "color", "#fff", "text-align", "right", "min-width", "220px"], [2, "font-size", "10.5px", "margin-top", "4px"], [2, "font-size", "10.5px", "color", "rgba(255,255,255,.9)"], [2, "width", "8px", "border-radius", "6px", "flex-shrink", "0"], [2, "display", "flex", "justify-content", "space-between", "align-items", "flex-start", "flex", "1", "gap", "16px", "flex-wrap", "wrap"], [2, "display", "flex", "gap", "12px", "align-items", "center"], [2, "height", "34px", "max-width", "110px", "object-fit", "contain", 3, "src"], [2, "font-size", "11px", "color", "var(--muted)", "margin-top", "2px"], [2, "font-weight", "800", "font-size", "20px"], [2, "font-size", "11px", "margin-top", "4px"], [2, "font-size", "11px", "color", "var(--red)"], [2, "display", "flex", "gap", "10px", "align-items", "flex-start"], [2, "height", "30px", "max-width", "90px", "object-fit", "contain", 3, "src"], [2, "font-weight", "800", "font-size", "14px"], [2, "font-size", "10px", "color", "var(--muted)", "margin-top", "2px"], [2, "font-weight", "800", "font-size", "15px"], [2, "font-size", "10.5px", "color", "var(--muted)", "margin-top", "3px"], [2, "font-size", "10.5px", "color", "var(--red)"], [2, "border-radius", "8px", "padding", "12px 14px", "display", "flex", "gap", "10px"], [2, "height", "28px", "max-width", "90px", "object-fit", "contain", 3, "src"], [2, "font-weight", "800", "font-size", "13px"], [2, "border-radius", "8px", "padding", "12px 14px", "text-align", "right"], [2, "font-size", "11px", "color", "var(--muted)", "margin-top", "3px"], [2, "font-weight", "800", "font-size", "19px", "margin-top", "10px"], [2, "display", "flex", "gap", "12px", "align-items", "flex-start"], [2, "height", "36px", "max-width", "110px", "object-fit", "contain", 3, "src"], [2, "font-size", "20px", "font-weight", "800"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.7", "margin-top", "6px"], [1, "mono"], [2, "font-size", "26px", "font-weight", "800", "letter-spacing", "-0.5px"], [1, "mono", 2, "font-size", "15px", "font-weight", "700", "margin-top", "4px"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "6px"], [2, "font-size", "12px", "color", "var(--red)"], [2, "height", "2px", "margin", "22px 0 2px"], [2, "height", "1px", "opacity", ".5", "margin-bottom", "22px"], [2, "margin", "22px 0"], [2, "height", "3px", "border-radius", "4px", "margin", "22px 0 28px"], [2, "padding", "11px 12px", "font-size", "11px"], [2, "border-bottom", "1px solid #e0e7ff"], [2, "padding", "11px 12px", "color", "var(--faint)"], [2, "padding", "11px 12px", "font-weight", "600"], [1, "mono", 2, "padding", "11px 12px", "color", "var(--muted)"], [2, "padding", "11px 12px", "text-align", "right", "color", "var(--muted)"], [2, "padding", "11px 12px", "text-align", "right", "color", "#374151"], [2, "padding", "11px 12px", "text-align", "right", "font-weight", "600"], [2, "font-size", "10px", "color", "var(--faint)", "text-transform", "uppercase", "letter-spacing", "1px", "font-weight", "700", "margin-bottom", "5px"], [2, "font-size", "12px", "color", "var(--muted)", "line-height", "1.6"], [2, "border-radius", "10px", "padding", "14px"], [2, "font-size", "10px", "color", "var(--faint)", "text-transform", "uppercase", "letter-spacing", "1px", "font-weight", "700", "margin-bottom", "6px"], [2, "font-size", "12px", "color", "#334155", "line-height", "1.8"], [2, "font-size", "12px", "background", "#eef2ff", "border-radius", "8px", "padding", "10px 12px", "margin-top", "10px", "line-height", "1.6"], [2, "border-top", "1.5px solid", "padding-top", "9px", "font-size", "12px", "min-width", "180px"], [2, "font-size", "12px", "font-weight", "700", "margin-top", "3px"]], template: function InvoiceDocumentComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275template(1, InvoiceDocumentComponent_Case_1_Template, 16, 9)(2, InvoiceDocumentComponent_Case_2_Template, 6, 6, "div", 1)(3, InvoiceDocumentComponent_Case_3_Template, 10, 6, "div", 2)(4, InvoiceDocumentComponent_Case_4_Template, 14, 9, "div", 3)(5, InvoiceDocumentComponent_Case_5_Template, 16, 13, "div", 4)(6, InvoiceDocumentComponent_Case_6_Template, 14, 10, "div", 5)(7, InvoiceDocumentComponent_Case_7_Template, 14, 13, "div", 5)(8, InvoiceDocumentComponent_Case_8_Template, 9, 12, "div", 6)(9, InvoiceDocumentComponent_Case_9_Template, 20, 12, "div", 7)(10, InvoiceDocumentComponent_Case_10_Template, 2, 4)(11, InvoiceDocumentComponent_Case_11_Template, 1, 2, "div", 8)(12, InvoiceDocumentComponent_Case_12_Template, 1, 0, "div", 9)(13, InvoiceDocumentComponent_Case_13_Template, 1, 2, "div", 10);
      \u0275\u0275elementStart(14, "div", 11)(15, "div")(16, "div", 12);
      \u0275\u0275text(17, "Bill To");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "div", 13);
      \u0275\u0275text(19);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "div", 14);
      \u0275\u0275template(21, InvoiceDocumentComponent_Conditional_21_Template, 2, 1, "div")(22, InvoiceDocumentComponent_Conditional_22_Template, 4, 1, "div");
      \u0275\u0275elementStart(23, "div");
      \u0275\u0275text(24);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(25, "div", 15)(26, "div", 12);
      \u0275\u0275text(27, "Supply Details");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(28, "div", 16)(29, "div");
      \u0275\u0275text(30, "Tax type: ");
      \u0275\u0275elementStart(31, "strong");
      \u0275\u0275text(32);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(33, "div");
      \u0275\u0275text(34);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(35, "div");
      \u0275\u0275text(36);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(37, "table", 17)(38, "thead")(39, "tr");
      \u0275\u0275repeaterCreate(40, InvoiceDocumentComponent_For_41_Template, 2, 5, "th", 18, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(42, "tbody");
      \u0275\u0275repeaterCreate(43, InvoiceDocumentComponent_For_44_Template, 17, 16, "tr", 19, \u0275\u0275repeaterTrackByIndex);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(45, "div", 20)(46, "div", 21);
      \u0275\u0275template(47, InvoiceDocumentComponent_Conditional_47_Template, 5, 1, "div")(48, InvoiceDocumentComponent_Conditional_48_Template, 7, 5, "div", 22);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "div")(50, "div", 23)(51, "div", 24)(52, "span", 25);
      \u0275\u0275text(53, "Subtotal");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "span", 26);
      \u0275\u0275text(55);
      \u0275\u0275elementEnd()();
      \u0275\u0275template(56, InvoiceDocumentComponent_Conditional_56_Template, 5, 1, "div", 24)(57, InvoiceDocumentComponent_Conditional_57_Template, 10, 2);
      \u0275\u0275elementStart(58, "div", 27)(59, "span", 28);
      \u0275\u0275text(60, "Total");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "span", 29);
      \u0275\u0275text(62);
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(63, InvoiceDocumentComponent_Conditional_63_Template, 4, 3, "div", 30);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(64, "div", 31)(65, "div", 32);
      \u0275\u0275text(66, "This is a computer generated invoice.");
      \u0275\u0275elementEnd();
      \u0275\u0275template(67, InvoiceDocumentComponent_Conditional_67_Template, 5, 7, "div", 33);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      let tmp_2_0;
      let tmp_3_0;
      let tmp_7_0;
      let tmp_8_0;
      let tmp_9_0;
      let tmp_10_0;
      let tmp_13_0;
      let tmp_20_0;
      \u0275\u0275styleProp("font-family", ctx.fontStack())("background", ctx.paperBg());
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_2_0 = ctx.tpl().headerStyle) === "band" ? 1 : tmp_2_0 === "bandLarge" ? 2 : tmp_2_0 === "gradient" ? 3 : tmp_2_0 === "diagonal" ? 4 : tmp_2_0 === "sidebar" ? 5 : tmp_2_0 === "split" ? 6 : tmp_2_0 === "boxed" ? 7 : tmp_2_0 === "centered" ? 8 : 9);
      \u0275\u0275advance(9);
      \u0275\u0275conditional((tmp_3_0 = ctx.tpl().dividerStyle) === "double" ? 10 : tmp_3_0 === "dotted" ? 11 : tmp_3_0 === "none" ? 12 : 13);
      \u0275\u0275advance(4);
      \u0275\u0275styleProp("background", ctx.tpl().tableStyle === "boxed" ? "transparent" : ctx.panelBg())("border", ctx.tpl().tableStyle === "boxed" ? "1px solid " + ctx.accentColor() : "none");
      \u0275\u0275advance(4);
      \u0275\u0275styleProp("color", ctx.dark);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate((tmp_7_0 = ctx.client()) == null ? null : tmp_7_0.companyName);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(((tmp_8_0 = ctx.client()) == null ? null : tmp_8_0.address) ? 21 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(((tmp_9_0 = ctx.client()) == null ? null : tmp_9_0.gstin) ? 22 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate2("State: ", ctx.stateName(((tmp_10_0 = ctx.client()) == null ? null : tmp_10_0.stateCode) || ""), " (", (tmp_10_0 = ctx.client()) == null ? null : tmp_10_0.stateCode, ")");
      \u0275\u0275advance(7);
      \u0275\u0275styleProp("color", ctx.dark);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate(ctx.invoice().totals.isIGST ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1("Place of supply: ", ctx.stateName(((tmp_13_0 = ctx.client()) == null ? null : tmp_13_0.stateCode) || ""), "");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1("Terms: ", ctx.invoice().paymentTerms || "Net 15", "");
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("background", ctx.tpl().tableStyle === "minimal" ? "transparent" : ctx.tpl().tableStyle === "boxed" ? ctx.accentColor() : ctx.dark)("border-bottom", ctx.tpl().tableStyle === "minimal" ? "1.5px solid var(--faint)" : "none");
      \u0275\u0275advance();
      \u0275\u0275repeater(\u0275\u0275pureFunction0(39, _c0));
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.invoice().items);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.invoice().notes ? 47 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showBankDetails() && (((tmp_20_0 = ctx.invoice().bankDetails) == null ? null : tmp_20_0.bank) || ((tmp_20_0 = ctx.invoice().bankDetails) == null ? null : tmp_20_0.account)) ? 48 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.panelBg());
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.invoice().totals.subtotal));
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.invoice().totals.isIGST ? 56 : 57);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("border-top", "2px solid " + ctx.accentColor());
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("color", ctx.accentColor());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate(ctx.fmtINR(ctx.invoice().totals.total));
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.showAmountInWords() ? 63 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275conditional(ctx.showSignature() ? 67 : -1);
    }
  }, dependencies: [CommonModule], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoiceDocumentComponent, { className: "InvoiceDocumentComponent", filePath: "src\\app\\shared\\invoice-document.component.ts", lineNumber: 298 });
})();

export {
  INVOICE_TEMPLATES,
  CUSTOM_TEMPLATE_ID,
  DEFAULT_CUSTOM_INVOICE_TEMPLATE,
  FONT_OPTIONS,
  HEADER_STYLE_OPTIONS,
  TITLE_ALIGN_OPTIONS,
  TABLE_STYLE_OPTIONS,
  DIVIDER_STYLE_OPTIONS,
  PAPER_TONE_OPTIONS,
  InvoiceDocumentComponent
};
//# sourceMappingURL=chunk-M35RZKI5.js.map
