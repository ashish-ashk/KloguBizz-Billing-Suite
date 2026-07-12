import {
  IconComponent,
  QuickSearchComponent
} from "./chunk-XXTTC3T3.js";
import {
  ThemeService
} from "./chunk-D76BFOPY.js";
import {
  AvatarComponent,
  PillComponent,
  ToastsComponent
} from "./chunk-JIDZ6YQM.js";
import {
  AuthService,
  Router,
  RouterLink,
  RouterLinkActive
} from "./chunk-AGABJEXX.js";
import {
  computed,
  signal,
  viewChild,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵpropertyInterpolate,
  ɵɵqueryAdvance,
  ɵɵresetView,
  ɵɵresolveDocument,
  ɵɵresolveWindow,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuerySignal
} from "./chunk-KLA3EWNB.js";

// src/app/shared/app-shell.component.ts
var _c0 = [[["", "actions", ""]], "*"];
var _c1 = ["[actions]", "*"];
function AppShellComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 9);
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("src", (tmp_1_0 = ctx_r0.auth.organisation()) == null ? null : tmp_1_0.brandingConfig == null ? null : tmp_1_0.brandingConfig.logoUrl, \u0275\u0275sanitizeUrl);
  }
}
function AppShellComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10);
    \u0275\u0275text(1, "K");
    \u0275\u0275elementEnd();
  }
}
function AppShellComponent_Conditional_61_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275text(1, "Customize");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "a", 61)(3, "span", 17);
    \u0275\u0275element(4, "app-icon", 62);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 19);
    \u0275\u0275text(6, "Appearance");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "a", 63)(8, "span", 17);
    \u0275\u0275element(9, "app-icon", 64);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 19);
    \u0275\u0275text(11, "Invoice Templates");
    \u0275\u0275elementEnd()();
  }
}
function AppShellComponent_Conditional_62_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275text(1, "Platform");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "a", 65)(3, "span", 17);
    \u0275\u0275element(4, "app-icon", 66);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 19);
    \u0275\u0275text(6, "Super Admin");
    \u0275\u0275elementEnd()();
  }
}
function AppShellComponent_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 67);
    \u0275\u0275listener("click", function AppShellComponent_Conditional_85_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.theme.toggleDarkMode());
    });
    \u0275\u0275element(1, "app-icon", 6);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("title", ctx_r0.theme.isDarkActive() ? "Switch to Light Mode" : "Switch to Dark Mode");
    \u0275\u0275attribute("aria-label", ctx_r0.theme.isDarkActive() ? "Switch to light mode" : "Switch to dark mode");
    \u0275\u0275advance();
    \u0275\u0275property("name", ctx_r0.theme.isDarkActive() ? "sun" : "moon")("size", 17);
  }
}
function AppShellComponent_Conditional_93_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 68);
    \u0275\u0275listener("click", function AppShellComponent_Conditional_93_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(1, "div", 69);
    \u0275\u0275element(2, "app-avatar", 6);
    \u0275\u0275elementStart(3, "div", 70)(4, "div", 71);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 72);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
    \u0275\u0275element(8, "div", 73);
    \u0275\u0275elementStart(9, "button", 74);
    \u0275\u0275listener("click", function AppShellComponent_Conditional_93_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.auth.logout());
    });
    \u0275\u0275element(10, "app-icon", 42);
    \u0275\u0275text(11, " Sign Out");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_3_0;
    let tmp_4_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275property("name", ((tmp_1_0 = ctx_r0.auth.user()) == null ? null : tmp_1_0.name) || "?")("size", 36);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_3_0 = ctx_r0.auth.user()) == null ? null : tmp_3_0.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((tmp_4_0 = ctx_r0.auth.user()) == null ? null : tmp_4_0.email);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 15);
  }
}
function AppShellComponent_Conditional_99_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.subtitle);
  }
}
var COLLAPSE_KEY = "klogubizz_sidebar_collapsed";
var AppShellComponent = class _AppShellComponent {
  auth;
  theme;
  router;
  title = "";
  subtitle = "";
  menuOpen = signal(false);
  userMenuOpen = signal(false);
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === "1");
  quickSearch = viewChild(QuickSearchComponent);
  commandItems = computed(() => {
    const items = [
      { label: "Dashboard", route: "/dashboard", icon: "dashboard" },
      { label: "Invoices", route: "/invoices", icon: "invoice" },
      { label: "Bill Generator", route: "/bill-generator", icon: "calculator" },
      { label: "Clients", route: "/clients", icon: "users" },
      { label: "Payments", route: "/payments", icon: "creditCard" },
      { label: "Reports", route: "/reports", icon: "chart" },
      { label: "Users & Roles", route: "/users", icon: "shieldUser" },
      { label: "Subscription", route: "/subscription", icon: "package" }
    ];
    if (this.auth.user()?.role === "admin") {
      items.push({ label: "Appearance", route: "/appearance", icon: "palette" }, { label: "Invoice Templates", route: "/invoice-templates", icon: "template" });
    }
    if (this.auth.isSuperAdmin()) {
      items.push({ label: "Super Admin", route: "/super-admin", icon: "shield" });
    }
    return items;
  });
  constructor(auth, theme, router) {
    this.auth = auth;
    this.theme = theme;
    this.router = router;
  }
  orgInitials() {
    const name = this.auth.organisation()?.name || this.auth.user()?.name || "?";
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  }
  toggleCollapse() {
    this.collapsed.update((v) => !v);
    localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? "1" : "0");
  }
  toggleUserMenu(event) {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }
  closeUserMenu() {
    this.userMenuOpen.set(false);
  }
  onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.quickSearch()?.focusInput();
    }
  }
  static \u0275fac = function AppShellComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppShellComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ThemeService), \u0275\u0275directiveInject(Router));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppShellComponent, selectors: [["app-shell"]], viewQuery: function AppShellComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuerySignal(ctx.quickSearch, QuickSearchComponent, 5);
    }
    if (rf & 2) {
      \u0275\u0275queryAdvance();
    }
  }, hostBindings: function AppShellComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275listener("click", function AppShellComponent_click_HostBindingHandler() {
        return ctx.closeUserMenu();
      }, false, \u0275\u0275resolveDocument)("keydown", function AppShellComponent_keydown_HostBindingHandler($event) {
        return ctx.onKeydown($event);
      }, false, \u0275\u0275resolveWindow);
    }
  }, inputs: { title: "title", subtitle: "subtitle" }, standalone: true, features: [\u0275\u0275StandaloneFeature], ngContentSelectors: _c1, decls: 104, vars: 34, consts: [["type", "button", "aria-label", "Toggle menu", 1, "menu-toggle", "no-print", 3, "click"], ["name", "menu", 3, "size"], [1, "shell"], [1, "sidebar", "no-print"], ["aria-hidden", "true", 1, "sidebar-glow"], ["type", "button", 1, "collapse-toggle", "no-print", 3, "click", "title"], [3, "name", "size"], [1, "sidebar-logo"], [1, "brand"], ["alt", "Logo", 1, "brand-logo-img", 3, "src"], [1, "brand-mark"], [1, "brand-text"], [1, "brand-name"], [1, "brand-sub"], [1, "nav", 3, "click"], [1, "nav-section"], ["routerLink", "/dashboard", "routerLinkActive", "active", "title", "Dashboard"], [1, "nav-icon"], ["name", "dashboard"], [1, "nav-label"], ["routerLink", "/invoices", "routerLinkActive", "active", "title", "Invoices"], ["name", "invoice"], ["routerLink", "/bill-generator", "routerLinkActive", "active", "title", "Bill Generator"], ["name", "calculator"], ["routerLink", "/clients", "routerLinkActive", "active", "title", "Clients"], ["name", "users"], ["routerLink", "/payments", "routerLinkActive", "active", "title", "Payments"], ["name", "creditCard"], ["routerLink", "/reports", "routerLinkActive", "active", "title", "Reports"], ["name", "chart"], ["routerLink", "/users", "routerLinkActive", "active", "title", "Users & Roles"], ["name", "shieldUser"], ["routerLink", "/subscription", "routerLinkActive", "active", "title", "Subscription"], ["name", "package"], [1, "sidebar-foot"], [1, "sidebar-user-row"], [1, "sidebar-org", 3, "title"], [1, "brand-mark", "org-mark"], [1, "org-info"], [1, "org-name"], [1, "org-plan"], ["type", "button", "title", "Sign Out", "aria-label", "Sign Out", 1, "sidebar-icon-btn", "nav-label", 3, "click"], ["name", "logout", 3, "size"], [1, "main"], [1, "topbar", "no-print"], [1, "topbar-crumb"], [1, "crumb-org"], ["name", "chevronRight", 1, "crumb-sep", 3, "size"], [1, "crumb-page"], [1, "no-print", 3, "navigate", "items"], [1, "topbar-right"], ["type", "button", 1, "icon-btn", 3, "title"], [1, "topbar-user", 3, "click"], [1, "topbar-user-info"], [1, "topbar-user-name"], [3, "status"], ["name", "chevronDown", 1, "chevron", 3, "size"], [1, "user-dropdown"], [1, "page", "page-enter"], [1, "page-head"], [1, "page-actions", "no-print"], ["routerLink", "/appearance", "routerLinkActive", "active", "title", "Appearance"], ["name", "palette"], ["routerLink", "/invoice-templates", "routerLinkActive", "active", "title", "Invoice Templates"], ["name", "template"], ["routerLink", "/super-admin", "routerLinkActive", "active", "title", "Super Admin"], ["name", "shield"], ["type", "button", 1, "icon-btn", 3, "click", "title"], [1, "user-dropdown", 3, "click"], [1, "user-dropdown-head"], [1, "user-dropdown-id"], [1, "user-dropdown-name"], [1, "user-dropdown-email"], [1, "user-dropdown-divider"], ["type", "button", 3, "click"]], template: function AppShellComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef(_c0);
      \u0275\u0275elementStart(0, "button", 0);
      \u0275\u0275listener("click", function AppShellComponent_Template_button_click_0_listener() {
        return ctx.menuOpen.set(!ctx.menuOpen());
      });
      \u0275\u0275element(1, "app-icon", 1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(2, "div", 2)(3, "aside", 3);
      \u0275\u0275element(4, "div", 4);
      \u0275\u0275elementStart(5, "button", 5);
      \u0275\u0275listener("click", function AppShellComponent_Template_button_click_5_listener() {
        return ctx.toggleCollapse();
      });
      \u0275\u0275element(6, "app-icon", 6);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(7, "div", 7)(8, "div", 8);
      \u0275\u0275template(9, AppShellComponent_Conditional_9_Template, 1, 1, "img", 9)(10, AppShellComponent_Conditional_10_Template, 2, 0, "div", 10);
      \u0275\u0275elementStart(11, "div", 11)(12, "div", 12);
      \u0275\u0275text(13, "Klogu Bizz");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "div", 13);
      \u0275\u0275text(15, "GST Billing Suite");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(16, "nav", 14);
      \u0275\u0275listener("click", function AppShellComponent_Template_nav_click_16_listener() {
        return ctx.menuOpen.set(false);
      });
      \u0275\u0275elementStart(17, "div", 15);
      \u0275\u0275text(18, "Main Menu");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "a", 16)(20, "span", 17);
      \u0275\u0275element(21, "app-icon", 18);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "span", 19);
      \u0275\u0275text(23, "Dashboard");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(24, "a", 20)(25, "span", 17);
      \u0275\u0275element(26, "app-icon", 21);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "span", 19);
      \u0275\u0275text(28, "Invoices");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(29, "a", 22)(30, "span", 17);
      \u0275\u0275element(31, "app-icon", 23);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "span", 19);
      \u0275\u0275text(33, "Bill Generator");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(34, "div", 15);
      \u0275\u0275text(35, "Management");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "a", 24)(37, "span", 17);
      \u0275\u0275element(38, "app-icon", 25);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "span", 19);
      \u0275\u0275text(40, "Clients");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(41, "a", 26)(42, "span", 17);
      \u0275\u0275element(43, "app-icon", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "span", 19);
      \u0275\u0275text(45, "Payments");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(46, "a", 28)(47, "span", 17);
      \u0275\u0275element(48, "app-icon", 29);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "span", 19);
      \u0275\u0275text(50, "Reports");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(51, "a", 30)(52, "span", 17);
      \u0275\u0275element(53, "app-icon", 31);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(54, "span", 19);
      \u0275\u0275text(55, "Users & Roles");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(56, "a", 32)(57, "span", 17);
      \u0275\u0275element(58, "app-icon", 33);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "span", 19);
      \u0275\u0275text(60, "Subscription");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(61, AppShellComponent_Conditional_61_Template, 12, 0)(62, AppShellComponent_Conditional_62_Template, 7, 0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "div", 34)(64, "div", 35)(65, "div", 36)(66, "div", 37);
      \u0275\u0275text(67);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(68, "div", 38)(69, "div", 39);
      \u0275\u0275text(70);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(71, "div", 40);
      \u0275\u0275text(72);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(73, "button", 41);
      \u0275\u0275listener("click", function AppShellComponent_Template_button_click_73_listener() {
        return ctx.auth.logout();
      });
      \u0275\u0275element(74, "app-icon", 42);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(75, "main", 43)(76, "div", 44)(77, "div", 45)(78, "span", 46);
      \u0275\u0275text(79);
      \u0275\u0275elementEnd();
      \u0275\u0275element(80, "app-icon", 47);
      \u0275\u0275elementStart(81, "span", 48);
      \u0275\u0275text(82);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(83, "app-quick-search", 49);
      \u0275\u0275listener("navigate", function AppShellComponent_Template_app_quick_search_navigate_83_listener($event) {
        return ctx.router.navigateByUrl($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(84, "div", 50);
      \u0275\u0275template(85, AppShellComponent_Conditional_85_Template, 2, 4, "button", 51);
      \u0275\u0275elementStart(86, "div", 52);
      \u0275\u0275listener("click", function AppShellComponent_Template_div_click_86_listener($event) {
        return ctx.toggleUserMenu($event);
      });
      \u0275\u0275element(87, "app-avatar", 6);
      \u0275\u0275elementStart(88, "div", 53)(89, "div", 54);
      \u0275\u0275text(90);
      \u0275\u0275elementEnd();
      \u0275\u0275element(91, "app-pill", 55);
      \u0275\u0275elementEnd();
      \u0275\u0275element(92, "app-icon", 56);
      \u0275\u0275template(93, AppShellComponent_Conditional_93_Template, 12, 5, "div", 57);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(94, "div", 58)(95, "div", 59)(96, "div")(97, "h1");
      \u0275\u0275text(98);
      \u0275\u0275elementEnd();
      \u0275\u0275template(99, AppShellComponent_Conditional_99_Template, 2, 1, "p");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(100, "div", 60);
      \u0275\u0275projection(101);
      \u0275\u0275elementEnd()();
      \u0275\u0275projection(102, 1);
      \u0275\u0275elementEnd()()();
      \u0275\u0275element(103, "app-toasts");
    }
    if (rf & 2) {
      let tmp_8_0;
      let tmp_9_0;
      let tmp_11_0;
      let tmp_13_0;
      let tmp_14_0;
      let tmp_16_0;
      let tmp_21_0;
      let tmp_23_0;
      let tmp_24_0;
      \u0275\u0275advance();
      \u0275\u0275property("size", 19);
      \u0275\u0275advance();
      \u0275\u0275classProp("sidebar-collapsed", ctx.collapsed());
      \u0275\u0275advance();
      \u0275\u0275classProp("open", ctx.menuOpen())("collapsed", ctx.collapsed());
      \u0275\u0275advance(2);
      \u0275\u0275property("title", ctx.collapsed() ? "Expand" : "Collapse");
      \u0275\u0275attribute("aria-label", ctx.collapsed() ? "Expand sidebar" : "Collapse sidebar");
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.collapsed() ? "chevronRight" : "chevronLeft")("size", 13);
      \u0275\u0275advance(3);
      \u0275\u0275conditional(((tmp_8_0 = ctx.auth.organisation()) == null ? null : tmp_8_0.brandingConfig == null ? null : tmp_8_0.brandingConfig.logoUrl) ? 9 : 10);
      \u0275\u0275advance(52);
      \u0275\u0275conditional(((tmp_9_0 = ctx.auth.user()) == null ? null : tmp_9_0.role) === "admin" ? 61 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.auth.isSuperAdmin() ? 62 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275propertyInterpolate("title", ((tmp_11_0 = ctx.auth.organisation()) == null ? null : tmp_11_0.name) || ((tmp_11_0 = ctx.auth.user()) == null ? null : tmp_11_0.name));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.orgInitials());
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(((tmp_13_0 = ctx.auth.organisation()) == null ? null : tmp_13_0.name) || ((tmp_13_0 = ctx.auth.user()) == null ? null : tmp_13_0.name) || "\u2014");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate((tmp_14_0 = ctx.auth.user()) == null ? null : tmp_14_0.email);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 15);
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(((tmp_16_0 = ctx.auth.organisation()) == null ? null : tmp_16_0.name) || "Workspace");
      \u0275\u0275advance();
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.title);
      \u0275\u0275advance();
      \u0275\u0275property("items", ctx.commandItems());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.theme.canToggleDarkMode() ? 85 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275property("name", ((tmp_21_0 = ctx.auth.user()) == null ? null : tmp_21_0.name) || "?")("size", 34);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate((tmp_23_0 = ctx.auth.user()) == null ? null : tmp_23_0.name);
      \u0275\u0275advance();
      \u0275\u0275property("status", ((tmp_24_0 = ctx.auth.user()) == null ? null : tmp_24_0.role) || "viewer");
      \u0275\u0275advance();
      \u0275\u0275classProp("open", ctx.userMenuOpen());
      \u0275\u0275property("size", 14);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.userMenuOpen() ? 93 : -1);
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(ctx.title);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.subtitle ? 99 : -1);
    }
  }, dependencies: [RouterLink, RouterLinkActive, ToastsComponent, AvatarComponent, PillComponent, IconComponent, QuickSearchComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppShellComponent, { className: "AppShellComponent", filePath: "src\\app\\shared\\app-shell.component.ts", lineNumber: 131 });
})();

export {
  AppShellComponent
};
//# sourceMappingURL=chunk-NTKKMEPP.js.map
